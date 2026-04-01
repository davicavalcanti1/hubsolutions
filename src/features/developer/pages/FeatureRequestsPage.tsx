import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, ChevronDown } from "lucide-react";

interface Request {
  id: string; title: string; description: string | null;
  status: string; votes: number;
  tenant_name: string; tenant_slug: string;
  created_at: string;
}

const STATUSES = ["pending", "reviewing", "planned", "in_progress", "done", "rejected"] as const;

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:     { label: "Pendente",      color: "bg-yellow-50 text-yellow-700 border-yellow-200"   },
  reviewing:   { label: "Em análise",    color: "bg-sky-50 text-sky-700 border-sky-200"            },
  planned:     { label: "Planejado",     color: "bg-violet-50 text-violet-700 border-violet-200"   },
  in_progress: { label: "Em andamento", color: "bg-primary/10 text-primary border-primary/20"     },
  done:        { label: "Concluído",     color: "bg-emerald-50 text-emerald-700 border-emerald-200"},
  rejected:    { label: "Rejeitado",     color: "bg-red-50 text-red-600 border-red-200"            },
};

export function FeatureRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter]     = useState<string>("all");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase
      .from("feature_requests")
      .select("id, title, description, status, votes, created_at, companies:company_id(name, slug)")
      .order("votes", { ascending: false })
      .then(({ data }) => {
        const mapped = (data ?? []).map(r => ({
          id:          r.id,
          title:       r.title,
          description: r.description,
          status:      r.status,
          votes:       r.votes,
          created_at:  r.created_at,
          tenant_name: (r.companies as any)?.name ?? "—",
          tenant_slug: (r.companies as any)?.slug ?? "",
        }));
        setRequests(mapped);
        setLoading(false);
      });
  }, []);

  const updateStatus = async (id: string, status: "pending" | "reviewing" | "planned" | "in_progress" | "done" | "rejected") => {
    await supabase.from("feature_requests").update({ status }).eq("id", id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  const counts = STATUSES.reduce((acc, s) => ({
    ...acc, [s]: requests.filter(r => r.status === s).length,
  }), {} as Record<string, number>);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-1">Painel Developer</p>
        <h1 className="text-2xl font-black text-foreground">Feature Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">{requests.length} sugestão{requests.length !== 1 ? "ões" : ""} no total</p>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={() => setFilter("all")}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            filter === "all"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}>
          Todos ({requests.length})
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === s ? STATUS_META[s].color : "border-border text-muted-foreground hover:text-foreground"
            }`}>
            {STATUS_META[s].label} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-4">
                {/* Votes */}
                <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-primary">{req.votes}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{req.title}</p>
                  {req.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{req.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    <span className="font-medium">{req.tenant_name}</span>
                    {" · "}{new Date(req.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                {/* Status selector */}
                <div className="relative shrink-0">
                  <div className="relative">
                    <select
                      value={req.status}
                      onChange={e => updateStatus(req.id, e.target.value as "pending" | "reviewing" | "planned" | "in_progress" | "done" | "rejected")}
                      className={`appearance-none text-[11px] font-bold uppercase px-3 py-1.5 pr-6 rounded-full border cursor-pointer bg-transparent focus:outline-none transition-colors ${STATUS_META[req.status]?.color ?? "border-border text-muted-foreground"}`}
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s}>
                          {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 pointer-events-none opacity-50" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhuma sugestão com esse status.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
