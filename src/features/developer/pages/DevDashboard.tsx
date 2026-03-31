import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import {
  Building2, Users, TrendingUp, Star, HardDrive,
  Server, Cloud, ArrowUpRight,
} from "lucide-react";

interface Overview {
  total_tenants: number;
  new_tenants_30d: number;
  total_users: number;
  mrr: number;
  pending_requests: number;
  planned_features: number;
  total_storage_used: number;
  local_tenants: number;
  cloud_tenants: number;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_name: string;
  db_tier: string;
  active: boolean;
  user_count: number;
  active_modules: number;
  storage_pct: number;
  primary_color: string;
  created_at: string;
}

function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-lime-400/20 bg-lime-400/[0.05]" : "border-white/[0.07] bg-[#0d0d0d]"}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-white/40">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ? "bg-lime-400/15 border border-lime-400/25" : "bg-white/[0.04] border border-white/[0.08]"}`}>
          <Icon className={`h-4 w-4 ${accent ? "text-lime-400" : "text-white/40"}`} />
        </div>
      </div>
      <p className={`text-3xl font-black tracking-tight ${accent ? "text-lime-400" : "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

function bytes(n: number) {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function DevDashboard() {
  const [ov, setOv]           = useState<Overview | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Overview>("/api/developer/overview"),
      api.get<Tenant[]>("/api/developer/tenants"),
    ]).then(([o, t]) => {
      setOv(o);
      setTenants(t.slice(0, 6));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-lime-400 uppercase tracking-[0.2em] mb-1">Painel Developer</p>
        <h1 className="text-2xl font-black">Visão Geral</h1>
        <p className="text-white/30 text-sm mt-1">Estado em tempo real da plataforma</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Empresas ativas" value={ov?.total_tenants ?? 0}
          sub={`+${ov?.new_tenants_30d ?? 0} esse mês`} icon={Building2} accent />
        <StatCard label="Usuários totais"  value={ov?.total_users ?? 0}  icon={Users} />
        <StatCard label="MRR"              value={`R$ ${Number(ov?.mrr ?? 0).toFixed(2)}`} icon={TrendingUp} />
        <StatCard label="Storage total"    value={bytes(Number(ov?.total_storage_used ?? 0))} icon={HardDrive} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Sugestões pendentes" value={ov?.pending_requests ?? 0} icon={Star} />
        <StatCard label="Em planejamento"     value={ov?.planned_features  ?? 0} icon={Star} />
        <StatCard label="Tenants locais"      value={ov?.local_tenants  ?? 0} icon={Server} />
        <StatCard label="Tenants cloud"       value={ov?.cloud_tenants  ?? 0} icon={Cloud} />
      </div>

      {/* Recent tenants */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-sm">Empresas recentes</h2>
          <Link to="/developer/tenants" className="flex items-center gap-1 text-xs text-lime-400 hover:text-lime-300 transition-colors">
            Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {tenants.map(t => (
            <Link key={t.id} to={`/developer/tenants/${t.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors group">
              {/* Color dot */}
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: `${t.primary_color}20`, color: t.primary_color, border: `1px solid ${t.primary_color}30` }}>
                {t.name[0]?.toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <p className="text-xs text-white/30">/{t.slug} · {t.user_count} usuários</p>
              </div>

              {/* Plan badge */}
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                t.plan_name === "pro" ? "bg-lime-400/15 text-lime-400" :
                t.plan_name === "enterprise" ? "bg-violet-400/15 text-violet-400" :
                "bg-white/[0.06] text-white/40"
              }`}>{t.plan_name}</span>

              {/* DB tier */}
              <span className={`text-[10px] px-2 py-1 rounded-full border ${
                t.db_tier === "local"
                  ? "border-sky-400/20 text-sky-400 bg-sky-400/[0.06]"
                  : "border-white/[0.08] text-white/30"
              }`}>
                {t.db_tier === "local" ? "local" : "cloud"}
              </span>

              {/* Active dot */}
              <div className={`w-2 h-2 rounded-full shrink-0 ${t.active ? "bg-lime-400" : "bg-red-500"}`} />

              <ArrowUpRight className="h-3.5 w-3.5 text-white/0 group-hover:text-white/30 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
