import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Building2, Users, TrendingUp, Star, HardDrive, ArrowUpRight } from "lucide-react";

interface Overview {
  total_tenants: number;
  new_tenants_30d: number;
  total_users: number;
  mrr: number;
  pending_requests: number;
  planned_features: number;
  total_storage_used: number;
}

interface Tenant {
  id: string; name: string; slug: string;
  plan_name: string; active: boolean;
  user_count: number; active_modules: number;
  storage_pct: number; primary_color: string; created_at: string;
}

function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 bg-card ${accent ? "border-primary/30" : "border-border"}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ? "bg-primary/10 border border-primary/20" : "bg-muted border border-border"}`}>
          <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </div>
      <p className={`text-3xl font-black tracking-tight ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function bytes(n: number) {
  if (!n) return "0 B";
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

const PLAN_BADGE: Record<string, string> = {
  pro:        "bg-primary/10 text-primary",
  enterprise: "bg-violet-500/10 text-violet-600",
  starter:    "bg-sky-500/10 text-sky-600",
  free:       "bg-muted text-muted-foreground",
};

export function DevDashboard() {
  const [ov, setOv]           = useState<Overview | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: totalTenants },
        { count: newTenants30d },
        { count: totalUsers },
        { count: pendingRequests },
        { count: plannedFeatures },
        { data: companiesData },
        { data: tenantsData },
      ] = await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("companies").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
        supabase.from("users").select("*", { count: "exact", head: true }).neq("role", "superadmin"),
        supabase.from("feature_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("feature_requests").select("*", { count: "exact", head: true }).eq("status", "planned"),
        supabase.from("companies").select("storage_used_bytes, plans:plan_id(price_monthly)").eq("active", true),
        supabase.from("companies")
          .select("id, name, slug, primary_color, active, created_at, plans:plan_id(name), users(id), company_modules(id, active)")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const mrr = (companiesData ?? []).reduce((acc, c) => acc + ((c.plans as any)?.price_monthly ?? 0), 0);
      const totalStorage = (companiesData ?? []).reduce((acc, c) => acc + (c.storage_used_bytes ?? 0), 0);

      const overview: Overview = {
        total_tenants:     totalTenants ?? 0,
        new_tenants_30d:   newTenants30d ?? 0,
        total_users:       totalUsers ?? 0,
        mrr,
        pending_requests:  pendingRequests ?? 0,
        planned_features:  plannedFeatures ?? 0,
        total_storage_used: totalStorage,
      };

      const tenantList = (tenantsData ?? []).map(t => ({
        id:             t.id,
        name:           t.name,
        slug:           t.slug,
        primary_color:  t.primary_color ?? "#3b82f6",
        active:         t.active,
        created_at:     t.created_at,
        plan_name:      (t.plans as any)?.name ?? "free",
        user_count:     (t.users as any[])?.length ?? 0,
        active_modules: (t.company_modules as any[])?.filter((m: any) => m.active).length ?? 0,
        storage_pct:    0,
      }));

      setOv(overview);
      setTenants(tenantList);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-1">Painel Developer</p>
        <h1 className="text-2xl font-black text-foreground">Visão Geral</h1>
        <p className="text-muted-foreground text-sm mt-1">Estado em tempo real da plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Empresas ativas" value={ov?.total_tenants ?? 0}
          sub={`+${ov?.new_tenants_30d ?? 0} esse mês`} icon={Building2} accent />
        <StatCard label="Usuários totais"  value={ov?.total_users ?? 0}    icon={Users} />
        <StatCard label="MRR"              value={`R$ ${Number(ov?.mrr ?? 0).toFixed(2)}`} icon={TrendingUp} />
        <StatCard label="Storage total"    value={bytes(Number(ov?.total_storage_used ?? 0))} icon={HardDrive} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <StatCard label="Sugestões pendentes" value={ov?.pending_requests ?? 0} icon={Star} />
        <StatCard label="Em planejamento"     value={ov?.planned_features  ?? 0} icon={Star} />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-sm text-foreground">Empresas recentes</h2>
          <Link to="/developer/tenants" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
            Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {tenants.map(t => (
            <Link key={t.id} to={`/developer/tenants/${t.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors group">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary">
                {t.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">/{t.slug} · {t.user_count} usuários · {t.active_modules} módulos</p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${PLAN_BADGE[t.plan_name] ?? PLAN_BADGE.free}`}>
                {t.plan_name}
              </span>
              <div className={`w-2 h-2 rounded-full shrink-0 ${t.active ? "bg-emerald-500" : "bg-red-400"}`} />
              <ArrowUpRight className="h-3.5 w-3.5 text-transparent group-hover:text-muted-foreground transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
