import { useEffect, useState } from "react";
import { api } from "@/lib/api";
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

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    api.get<Tenant[]>("/api/developer/tenants").then(data => {
      setTenants(data); setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (t: Tenant) => {
    await api.patch(`/api/developer/tenants/${t.id}`, { active: !t.active });
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
          <p className="text-xs font-semibold text-lime-400 uppercase tracking-[0.2em] mb-1">Painel Developer</p>
          <h1 className="text-2xl font-black">Empresas</h1>
          <p className="text-white/30 text-sm mt-1">{tenants.length} empresa{tenants.length !== 1 ? "s" : ""} registrada{tenants.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime-400 text-black text-sm font-semibold hover:bg-lime-300 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nova Empresa
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, slug ou e-mail..."
          className="w-full bg-[#0d0d0d] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-lime-400/40" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/[0.06] text-[10px] font-semibold text-white/25 uppercase tracking-widest">
            <span>Empresa</span><span>Plano</span><span>Storage</span><span>Módulos</span><span>Status</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {filtered.map(t => (
              <div key={t.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: `${t.primary_color}20`, color: t.primary_color, border: `1px solid ${t.primary_color}30` }}>
                    {t.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/developer/tenants/${t.id}`}
                      className="text-sm font-medium hover:text-lime-400 transition-colors flex items-center gap-1 group">
                      {t.name} <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-40" />
                    </Link>
                    <p className="text-[11px] text-white/25">/{t.slug} · {t.user_count} usuários</p>
                  </div>
                </div>

                <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full w-fit ${
                  t.plan_name === "pro" ? "bg-lime-400/15 text-lime-400" :
                  t.plan_name === "enterprise" ? "bg-violet-400/15 text-violet-400" :
                  t.plan_name === "starter" ? "bg-sky-400/15 text-sky-400" :
                  "bg-white/[0.06] text-white/40"
                }`}>{t.plan_name}</span>

                <div className="space-y-1">
                  <p className="text-[10px] text-white/30">{bytes(t.storage_used_bytes)}</p>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden w-24">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(Number(t.storage_pct) || 0, 100)}%`, background: Number(t.storage_pct) > 80 ? "#f87171" : "#a3e635" }} />
                  </div>
                </div>

                <p className="text-sm font-semibold">{t.active_modules}</p>

                <button onClick={() => toggleActive(t)} className="text-white/30 hover:text-white/60 transition-colors">
                  {t.active ? <ToggleRight className="h-5 w-5 text-lime-400" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
              </div>
            ))}
            {filtered.length === 0 && <div className="py-16 text-center text-white/20 text-sm">Nenhuma empresa encontrada.</div>}
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword.length < 8) { setError("Senha deve ter no mínimo 8 caracteres"); return; }
    setError(null);
    setSaving(true);
    try {
      await api.post("/api/developer/tenants", {
        company_name: companyName,
        company_slug: companySlug,
        company_email: companyEmail || null,
        admin_email: adminEmail,
        admin_name: adminName,
        admin_password: adminPassword,
        plan_name: planName,
      });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar empresa");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-bold">Nova Empresa</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}

          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Dados da empresa</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50">Nome da empresa *</label>
              <input value={companyName}
                onChange={e => { setCompanyName(e.target.value); setCompanySlug(slugify(e.target.value)); }}
                placeholder="Clínica Exemplo"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-lime-400/40"
                required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50">Slug *</label>
              <input value={companySlug}
                onChange={e => setCompanySlug(slugify(e.target.value))}
                placeholder="clinica-exemplo"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-lime-400/40"
                required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50">E-mail da empresa</label>
              <input value={companyEmail}
                onChange={e => setCompanyEmail(e.target.value)}
                type="email" placeholder="contato@empresa.com"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-lime-400/40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50">Plano</label>
              <select value={planName} onChange={e => setPlanName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-lime-400/40">
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Conta do administrador</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50">Nome do admin *</label>
                <input value={adminName} onChange={e => setAdminName(e.target.value)}
                  placeholder="João Silva"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-lime-400/40"
                  required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/50">E-mail do admin *</label>
                <input value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                  type="email" placeholder="admin@empresa.com"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-lime-400/40"
                  required />
              </div>
            </div>
            <div className="space-y-1.5 mt-4">
              <label className="text-xs font-medium text-white/50">Senha temporária *</label>
              <div className="relative">
                <input value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                  type={showPw ? "text" : "password"} placeholder="Mínimo 8 caracteres" minLength={8}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-lime-400/40 pr-10"
                  required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-white/25">O admin usará esta senha no primeiro login.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/40 hover:text-white/60 hover:border-white/20 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-lime-400 text-black text-sm font-semibold hover:bg-lime-300 transition-colors disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
