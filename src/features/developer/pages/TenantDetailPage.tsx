import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ToggleLeft, ToggleRight, Star, Check, X as XIcon, Plus, Loader2, Trash2, Eye, EyeOff } from "lucide-react";

interface TenantDetail {
  id: string; name: string; slug: string; email: string | null;
  plan_name: string; price_monthly: number;
  active: boolean; storage_used_bytes: number; storage_limit_bytes: number;
  primary_color: string; secondary_color: string;
  display_name: string | null; logo_url: string | null;
  created_at: string; max_users: number;
  members: { id: string; full_name: string; email: string; role: string; created_at: string }[];
  modules: { module_key: string; active: boolean; name: string; description: string }[];
  recent_requests: { id: string; title: string; status: string; votes: number; created_at: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-yellow-400/15 text-yellow-400 border-yellow-400/25",
  reviewing:   "bg-sky-400/15 text-sky-400 border-sky-400/25",
  planned:     "bg-violet-400/15 text-violet-400 border-violet-400/25",
  in_progress: "bg-lime-400/15 text-lime-400 border-lime-400/25",
  done:        "bg-emerald-400/15 text-emerald-400 border-emerald-400/25",
  rejected:    "bg-red-400/15 text-red-400 border-red-400/25",
};

function bytes(n: number) {
  if (!n) return "0 B";
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant]       = useState<TenantDetail | null>(null);
  const [companyMods, setCompanyMods] = useState<{ module_key: string; active: boolean }[]>([]);
  const [tab, setTab]             = useState<"overview" | "modules" | "members" | "requests">("overview");
  const [saving, setSaving]       = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const loadTenant = async () => {
    if (!id) return;

    const [
      { data: company },
      { data: members },
      { data: companyModsData },
      { data: allMods },
      { data: requests },
    ] = await Promise.all([
      supabase.from("companies").select("*, plans:plan_id(name, price_monthly, storage_limit_bytes, max_users)").eq("id", id).single(),
      supabase.from("users").select("id, full_name, email, role, created_at").eq("company_id", id).order("created_at"),
      supabase.from("company_modules").select("module_key, active").eq("company_id", id),
      supabase.from("modules").select("key, name, description"),
      supabase.from("feature_requests").select("id, title, status, votes, created_at").eq("company_id", id).order("created_at", { ascending: false }).limit(10),
    ]);

    if (!company) return;

    const plan = (company as any).plans as any;
    const modsData = companyModsData ?? [];
    setCompanyMods(modsData);

    const modules = (allMods ?? []).map(m => ({
      module_key:  m.key,
      active:      modsData.find(cm => cm.module_key === m.key)?.active ?? false,
      name:        m.name,
      description: m.description ?? "",
    }));

    setTenant({
      id:                   company.id,
      name:                 company.name,
      slug:                 company.slug,
      email:                company.email,
      display_name:         company.display_name,
      logo_url:             company.logo_url,
      primary_color:        company.primary_color ?? "#a3e635",
      secondary_color:      company.secondary_color ?? "#ffffff",
      active:               company.active,
      storage_used_bytes:   company.storage_used_bytes ?? 0,
      created_at:           company.created_at,
      plan_name:            plan?.name ?? "free",
      price_monthly:        plan?.price_monthly ?? 0,
      storage_limit_bytes:  plan?.storage_limit_bytes ?? 0,
      max_users:            plan?.max_users ?? 5,
      members:              (members ?? []) as any,
      modules,
      recent_requests:      (requests ?? []) as any,
    });
  };

  useEffect(() => { loadTenant(); }, [id]);

  const patch = async (body: Record<string, unknown>) => {
    if (!id || !tenant) return;
    setSaving(true);

    // Handle plan_name → look up plan_id
    if ("plan_name" in body) {
      const { data: plan } = await supabase
        .from("plans")
        .select("id")
        .eq("name", body.plan_name as string)
        .maybeSingle();
      if (plan) {
        await supabase.from("companies").update({ plan_id: plan.id }).eq("id", id);
      }
    } else {
      await supabase.from("companies").update(body).eq("id", id);
    }

    await loadTenant();
    setSaving(false);
  };

  const toggleModule = async (key: string) => {
    if (!id) return;
    setSaving(true);
    const existing = companyMods.find(cm => cm.module_key === key);
    if (existing) {
      await supabase
        .from("company_modules")
        .update({ active: !existing.active })
        .eq("company_id", id)
        .eq("module_key", key);
    } else {
      await supabase
        .from("company_modules")
        .insert({ company_id: id, module_key: key, active: true });
    }
    await loadTenant();
    setSaving(false);
  };

  const deleteMember = async (userId: string) => {
    if (!id || !confirm("Remover este membro? Ele perderá acesso à plataforma.")) return;
    try {
      const { data, error: fnError } = await supabase.functions.invoke("delete-member", {
        body: { user_id: userId },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setTenant(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== userId) } : prev);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao remover membro");
    }
  };

  if (!tenant) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
    </div>
  );

  const storagePct = Math.min((tenant.storage_used_bytes / tenant.storage_limit_bytes) * 100 || 0, 100);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/developer/tenants" className="flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Empresas
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
          style={{ background: `${tenant.primary_color}20`, color: tenant.primary_color, border: `1px solid ${tenant.primary_color}30` }}>
          {tenant.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black">{tenant.display_name ?? tenant.name}</h1>
            <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full border ${
              tenant.plan_name === "pro" ? "bg-lime-400/15 text-lime-400 border-lime-400/25" :
              tenant.plan_name === "enterprise" ? "bg-violet-400/15 text-violet-400 border-violet-400/25" :
              "bg-white/[0.06] text-white/30 border-white/[0.08]"
            }`}>{tenant.plan_name}</span>
          </div>
          <p className="text-white/30 text-sm mt-1">/{tenant.slug}{tenant.email ? ` · ${tenant.email}` : ""}</p>
        </div>
        <button onClick={() => patch({ active: !tenant.active })} disabled={saving}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-colors"
          style={tenant.active
            ? { borderColor: "rgba(163,230,53,0.25)", background: "rgba(163,230,53,0.06)", color: "#a3e635" }
            : { borderColor: "rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.3)" }
          }>
          {tenant.active ? <Check className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
          {tenant.active ? "Ativo" : "Inativo"}
        </button>
      </div>

      <div className="flex gap-1 border-b border-white/[0.06] mb-7">
        {(["overview", "modules", "members", "requests"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? "text-lime-400 border-lime-400" : "text-white/30 border-transparent hover:text-white/60"
            }`}>
            {t === "requests" ? "Sugestões" : t === "overview" ? "Visão Geral" : t === "modules" ? "Módulos" : `Membros (${tenant.members.length})`}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d0d] p-6">
            <h3 className="text-sm font-semibold mb-4">Armazenamento</h3>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-white/40">{bytes(tenant.storage_used_bytes)} usado</span>
              <span className="text-white/40">{bytes(tenant.storage_limit_bytes)} total</span>
            </div>
            <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${storagePct}%`, background: storagePct > 80 ? "#f87171" : "#a3e635" }} />
            </div>
            <p className="text-xs text-white/25 mt-2">{storagePct.toFixed(1)}% utilizado</p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d0d] p-6">
            <h3 className="text-sm font-semibold mb-4">Plano atual: <span className="text-lime-400 capitalize">{tenant.plan_name}</span></h3>
            <p className="text-xs text-white/30 mb-4">R$ {Number(tenant.price_monthly).toFixed(2)}/mês</p>
            <div className="flex gap-2 flex-wrap">
              {["free", "starter", "pro", "enterprise"].map(p => (
                <button key={p} onClick={() => patch({ plan_name: p })}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    tenant.plan_name === p
                      ? "border-lime-400/30 bg-lime-400/10 text-lime-400"
                      : "border-white/[0.08] text-white/30 hover:border-white/20 hover:text-white/60"
                  }`}>{p}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d0d] p-6">
            <h3 className="text-sm font-semibold mb-4">White-label</h3>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl border border-white/10" style={{ background: tenant.primary_color }} />
              <div>
                <p className="text-xs font-medium">Cor primária</p>
                <p className="text-xs text-white/30 font-mono">{tenant.primary_color}</p>
              </div>
              <div className="ml-6 text-sm text-white/40">
                Nome: <span className="text-white">{tenant.display_name ?? tenant.name}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "modules" && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] overflow-hidden">
          <div className="divide-y divide-white/[0.04]">
            {tenant.modules.map(mod => (
              <div key={mod.module_key} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{mod.name}</p>
                  <p className="text-xs text-white/30">{mod.description}</p>
                </div>
                <button
                  disabled={saving}
                  onClick={() => toggleModule(mod.module_key)}
                  className="ml-auto shrink-0 transition-opacity disabled:opacity-40"
                >
                  {mod.active
                    ? <ToggleRight className="h-5 w-5 text-lime-400" />
                    : <ToggleLeft  className="h-5 w-5 text-white/20" />}
                </button>
              </div>
            ))}
            {tenant.modules.length === 0 && (
              <p className="py-12 text-center text-sm text-white/20">
                Nenhum módulo cadastrado. Verifique se a migration foi executada.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "members" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lime-400 text-black text-sm font-semibold hover:bg-lime-300 transition-colors">
              <Plus className="h-4 w-4" /> Adicionar Membro
            </button>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] overflow-hidden">
            <div className="divide-y divide-white/[0.04]">
              {tenant.members.map(m => (
                <div key={m.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-xs font-bold">
                    {m.full_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.full_name}</p>
                    <p className="text-xs text-white/30">{m.email}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${
                    m.role === "admin"
                      ? "bg-lime-400/15 text-lime-400 border-lime-400/25"
                      : "bg-white/[0.06] text-white/30 border-white/[0.08]"
                  }`}>{m.role}</span>
                  <button onClick={() => deleteMember(m.id)}
                    className="text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {tenant.members.length === 0 && <p className="py-12 text-center text-sm text-white/20">Nenhum membro.</p>}
            </div>
          </div>

          {showAddMember && (
            <AddMemberModal
              tenantId={id!}
              onClose={() => setShowAddMember(false)}
              onAdded={() => { setShowAddMember(false); loadTenant(); }}
            />
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-3">
          {tenant.recent_requests.map(req => (
            <div key={req.id} className="flex items-start gap-4 p-5 rounded-2xl border border-white/[0.07] bg-[#0d0d0d]">
              <div className="flex-1">
                <p className="text-sm font-medium">{req.title}</p>
                <p className="text-xs text-white/25 mt-1">{new Date(req.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-white/30 flex items-center gap-1"><Star className="h-3 w-3" />{req.votes}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${STATUS_COLORS[req.status] ?? "bg-white/[0.06] text-white/30 border-white/[0.08]"}`}>
                  {req.status}
                </span>
              </div>
            </div>
          ))}
          {tenant.recent_requests.length === 0 && <p className="py-12 text-center text-sm text-white/20">Nenhuma sugestão.</p>}
        </div>
      )}
    </div>
  );
}

function AddMemberModal({ tenantId, onClose, onAdded }: { tenantId: string; onClose: () => void; onAdded: () => void }) {
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [role, setRole]           = useState<"admin" | "user">("user");
  const [showPw, setShowPw]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Senha deve ter no mínimo 8 caracteres"); return; }
    setError(null);
    setSaving(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("add-member", {
        body: { company_id: tenantId, full_name: fullName, email, password, role },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar membro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-bold">Adicionar Membro</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><XIcon className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Nome completo *</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="João Silva"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-lime-400/40"
              required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">E-mail *</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="usuario@empresa.com"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-lime-400/40"
              required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Senha temporária *</label>
            <div className="relative">
              <input value={password} onChange={e => setPassword(e.target.value)}
                type={showPw ? "text" : "password"} placeholder="Mínimo 8 caracteres" minLength={8}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-lime-400/40 pr-10"
                required />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Permissão</label>
            <div className="flex gap-2">
              {(["user", "admin"] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex-1 text-sm px-3 py-2 rounded-lg border transition-colors ${
                    role === r
                      ? "border-lime-400/30 bg-lime-400/10 text-lime-400"
                      : "border-white/[0.08] text-white/30 hover:border-white/20 hover:text-white/60"
                  }`}>{r === "admin" ? "Administrador" : "Usuário"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/40 hover:text-white/60 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-lime-400 text-black text-sm font-semibold hover:bg-lime-300 transition-colors disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
