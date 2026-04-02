import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight, ToggleLeft, ToggleRight, Plus, X, Loader2, Eye, EyeOff } from "lucide-react";

interface Tenant {
  id: string; name: string; slug: string; email: string | null;
  plan_name: string; price_monthly: number;
  active: boolean; user_count: number; active_modules: number;
  storage_pct: number; storage_used_bytes: number; primary_color: string;
  created_at: string;
}

function bytes(n: number) {
  if (!n) return "0 B";
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

const PLAN_BADGE: Record<string, string> = {
  pro:        "bg-primary/10 text-primary",
  enterprise: "bg-violet-500/10 text-violet-600",
  starter:    "bg-sky-500/10 text-sky-600",
  free:       "bg-muted text-muted-foreground",
};

async function fetchTenants(): Promise<Tenant[]> {
  const { data } = await supabase
    .from("companies")
    .select("id, name, slug, email, active, storage_used_bytes, primary_color, created_at, plans:plan_id(name, price_monthly, storage_limit_bytes), users(id), company_modules(id, active)")
    .order("created_at", { ascending: false });

  return (data ?? []).map(c => ({
    id:                 c.id,
    name:               c.name,
    slug:               c.slug,
    email:              c.email,
    plan_name:          (c.plans as any)?.name ?? "free",
    price_monthly:      (c.plans as any)?.price_monthly ?? 0,
    active:             c.active,
    user_count:         (c.users as any[])?.length ?? 0,
    active_modules:     (c.company_modules as any[])?.filter((m: any) => m.active).length ?? 0,
    storage_used_bytes: c.storage_used_bytes ?? 0,
    storage_pct:        c.storage_used_bytes && (c.plans as any)?.storage_limit_bytes
      ? Math.round(c.storage_used_bytes / (c.plans as any).storage_limit_bytes * 1000) / 10
      : 0,
    primary_color:      c.primary_color ?? "#3b82f6",
    created_at:         c.created_at,
  }));
}

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    fetchTenants().then(data => { setTenants(data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (t: Tenant) => {
    await supabase.from("companies").update({ active: !t.active }).eq("id", t.id);
    setTenants(prev => prev.map(x => x.id === t.id ? { ...x, active: !t.active } : x));
  };

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase()) ||
    (t.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-1">Painel Developer</p>
          <h1 className="text-2xl font-black text-foreground">Empresas</h1>
          <p className="text-muted-foreground text-sm mt-1">{tenants.length} empresa{tenants.length !== 1 ? "s" : ""} registrada{tenants.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nova Empresa
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, slug ou e-mail..."
          className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors shadow-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-widest bg-muted/40">
            <span>Empresa</span><span>Plano</span><span>Storage</span><span>Módulos</span><span>Status</span>
          </div>
          <div className="divide-y divide-border">
            {filtered.map(t => (
              <div key={t.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary">
                    {t.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/developer/tenants/${t.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1 group">
                      {t.name} <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-60" />
                    </Link>
                    <p className="text-[11px] text-muted-foreground">/{t.slug} · {t.user_count} usuários</p>
                  </div>
                </div>

                <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full w-fit ${PLAN_BADGE[t.plan_name] ?? PLAN_BADGE.free}`}>
                  {t.plan_name}
                </span>

                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">{bytes(t.storage_used_bytes)}</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden w-24">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(Number(t.storage_pct) || 0, 100)}%`, background: Number(t.storage_pct) > 80 ? "#ef4444" : "hsl(221 83% 53%)" }} />
                  </div>
                </div>

                <p className="text-sm font-semibold text-foreground">{t.active_modules}</p>

                <button onClick={() => toggleActive(t)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {t.active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
              </div>
            ))}
            {filtered.length === 0 && <div className="py-16 text-center text-muted-foreground text-sm">Nenhuma empresa encontrada.</div>}
          </div>
        </div>
      )}

      {showModal && (
        <CreateTenantModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); setLoading(true); load(); }}
        />
      )}
    </div>
  );
}

function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [companyName, setCompanyName]   = useState("");
  const [companySlug, setCompanySlug]   = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [adminName, setAdminName]       = useState("");
  const [adminEmail, setAdminEmail]     = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [planName, setPlanName]         = useState("free");
  const [showPw, setShowPw]             = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [availableModules, setAvailableModules] = useState<{ key: string; name: string; description: string | null }[]>([]);
  const [selectedModules, setSelectedModules]   = useState<string[]>([]);

  useEffect(() => {
    supabase.from("modules").select("key, name, description").order("name")
      .then(({ data }) => setAvailableModules(data ?? []));
  }, []);

  const toggleModuleSelection = (key: string) => {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword.length < 8) { setError("Senha deve ter no mínimo 8 caracteres"); return; }
    setError(null);
    setSaving(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-tenant", {
        body: {
          company_name:   companyName,
          company_slug:   companySlug,
          company_email:  companyEmail || null,
          admin_email:    adminEmail,
          admin_name:     adminName,
          admin_password: adminPassword,
          plan_name:      planName,
          module_keys:    selectedModules,
        },
      });
      if (fnError) {
        // Tenta extrair mensagem real do body da resposta
        let msg = fnError.message;
        try {
          const body = await (fnError as any).context?.json();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar empresa");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-foreground">Nova Empresa</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</div>}

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Dados da empresa</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">Nome da empresa *</label>
              <input value={companyName}
                onChange={e => { setCompanyName(e.target.value); setCompanySlug(slugify(e.target.value)); }}
                placeholder="Clínica Exemplo"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
                required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">Slug *</label>
              <input value={companySlug}
                onChange={e => setCompanySlug(slugify(e.target.value))}
                placeholder="clinica-exemplo"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
                required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">E-mail da empresa</label>
              <input value={companyEmail}
                onChange={e => setCompanyEmail(e.target.value)}
                type="email" placeholder="contato@empresa.com"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/70">Plano</label>
              <select value={planName} onChange={e => setPlanName(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors">
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          {availableModules.length > 0 && (
            <div className="border-t border-border pt-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Módulos ativos</p>
              <div className="space-y-2">
                {availableModules.map(mod => (
                  <label key={mod.key} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(mod.key)}
                      onChange={() => toggleModuleSelection(mod.key)}
                      className="w-4 h-4 accent-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{mod.name}</p>
                      {mod.description && <p className="text-xs text-muted-foreground">{mod.description}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Conta do administrador</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/70">Nome do admin *</label>
                <input value={adminName} onChange={e => setAdminName(e.target.value)}
                  placeholder="João Silva"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
                  required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/70">E-mail do admin *</label>
                <input value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                  type="email" placeholder="admin@empresa.com"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
                  required />
              </div>
            </div>
            <div className="space-y-1.5 mt-4">
              <label className="text-xs font-medium text-foreground/70">Senha temporária *</label>
              <div className="relative">
                <input value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                  type={showPw ? "text" : "password"} placeholder="Mínimo 8 caracteres" minLength={8}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors pr-10"
                  required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">O admin usará esta senha no primeiro login.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
