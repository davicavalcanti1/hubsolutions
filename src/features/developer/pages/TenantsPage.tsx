import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight, Plus, Server, Cloud, ToggleLeft, ToggleRight } from "lucide-react";

interface Tenant {
  id: string; name: string; slug: string; email: string | null;
  plan_name: string; price_monthly: number; db_tier: string;
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

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Tenant[]>("/api/developer/tenants").then(data => {
      setTenants(data);
      setLoading(false);
    });
  }, []);

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
        <button className="flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-black text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="h-4 w-4" /> Nova empresa
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, slug ou e-mail..."
          className="w-full bg-[#0d0d0d] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-lime-400/40"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/[0.06] text-[10px] font-semibold text-white/25 uppercase tracking-widest">
            <span>Empresa</span>
            <span>Plano</span>
            <span>DB Tier</span>
            <span>Storage</span>
            <span>Módulos</span>
            <span>Status</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {filtered.map(t => (
              <div key={t.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors">
                {/* Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: `${t.primary_color}20`, color: t.primary_color, border: `1px solid ${t.primary_color}30` }}>
                    {t.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/developer/tenants/${t.id}`}
                      className="text-sm font-medium hover:text-lime-400 transition-colors flex items-center gap-1 group">
                      {t.name}
                      <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-40" />
                    </Link>
                    <p className="text-[11px] text-white/25">/{t.slug} · {t.user_count} users</p>
                  </div>
                </div>

                {/* Plan */}
                <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full w-fit ${
                  t.plan_name === "pro" ? "bg-lime-400/15 text-lime-400" :
                  t.plan_name === "enterprise" ? "bg-violet-400/15 text-violet-400" :
                  t.plan_name === "starter" ? "bg-sky-400/15 text-sky-400" :
                  "bg-white/[0.06] text-white/40"
                }`}>{t.plan_name}</span>

                {/* DB Tier */}
                <div className="flex items-center gap-1.5">
                  {t.db_tier === "local"
                    ? <Server className="h-3.5 w-3.5 text-sky-400" />
                    : <Cloud className="h-3.5 w-3.5 text-white/30" />
                  }
                  <span className="text-xs text-white/40">{t.db_tier}</span>
                </div>

                {/* Storage bar */}
                <div className="space-y-1">
                  <p className="text-[10px] text-white/30">{bytes(t.storage_used_bytes)}</p>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden w-24">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(Number(t.storage_pct) || 0, 100)}%`,
                        background: Number(t.storage_pct) > 80 ? "#f87171" : "#a3e635"
                      }} />
                  </div>
                </div>

                {/* Modules */}
                <p className="text-sm font-semibold">{t.active_modules}</p>

                {/* Toggle active */}
                <button onClick={() => toggleActive(t)} className="text-white/30 hover:text-white/60 transition-colors">
                  {t.active ? <ToggleRight className="h-5 w-5 text-lime-400" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-16 text-center text-white/20 text-sm">Nenhuma empresa encontrada.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
