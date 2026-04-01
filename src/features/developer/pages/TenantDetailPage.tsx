import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ArrowLeft, ToggleLeft, ToggleRight, Star, Check, X as XIcon } from "lucide-react";

interface TenantDetail {
  id: string; name: string; slug: string; email: string | null;
  plan_name: string; price_monthly: number;
  active: boolean; storage_used_bytes: number; storage_limit_bytes: number;
  primary_color: string; secondary_color: string;
  display_name: string | null; logo_url: string | null;
  created_at: string;
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
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [tab, setTab]       = useState<"overview" | "modules" | "members" | "requests">("overview");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<TenantDetail>(`/api/developer/tenants/${id}`).then(setTenant);
  }, [id]);

  const patch = async (body: Record<string, unknown>) => {
    if (!id) return;
    setSaving(true);
    const updated = await api.patch<TenantDetail>(`/api/developer/tenants/${id}`, body);
    setTenant(prev => prev ? { ...prev, ...updated } : prev);
    setSaving(false);
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
            {t === "requests" ? "Sugestões" : t === "overview" ? "Visão Geral" : t === "modules" ? "Módulos" : "Membros"}
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
                <div>
                  <p className="text-sm font-medium">{mod.name}</p>
                  <p className="text-xs text-white/30">{mod.description}</p>
                </div>
                <div className="ml-auto">
                  {mod.active ? <ToggleRight className="h-5 w-5 text-lime-400" /> : <ToggleLeft className="h-5 w-5 text-white/20" />}
                </div>
              </div>
            ))}
            {tenant.modules.length === 0 && <p className="py-12 text-center text-sm text-white/20">Nenhum módulo ativo.</p>}
          </div>
        </div>
      )}

      {tab === "members" && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] overflow-hidden">
          <div className="divide-y divide-white/[0.04]">
            {tenant.members.map(m => (
              <div key={m.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-xs font-bold">
                  {m.full_name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{m.full_name}</p>
                  <p className="text-xs text-white/30">{m.email}</p>
                </div>
                <span className="ml-auto text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-white/[0.06] text-white/30">{m.role}</span>
              </div>
            ))}
            {tenant.members.length === 0 && <p className="py-12 text-center text-sm text-white/20">Nenhum membro.</p>}
          </div>
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
