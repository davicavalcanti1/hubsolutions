import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Star, ChevronDown } from "lucide-react";

interface Request {
  id: string; title: string; description: string | null;
  status: string; votes: number;
  tenant_name: string; tenant_slug: string;
  created_at: string;
}

const STATUSES = ["pending", "reviewing", "planned", "in_progress", "done", "rejected"] as const;

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:     { label: "Pendente",       color: "bg-yellow-400/15 text-yellow-400 border-yellow-400/25" },
  reviewing:   { label: "Em análise",     color: "bg-sky-400/15 text-sky-400 border-sky-400/25"         },
  planned:     { label: "Planejado",      color: "bg-violet-400/15 text-violet-400 border-violet-400/25"},
  in_progress: { label: "Em andamento",  color: "bg-lime-400/15 text-lime-400 border-lime-400/25"       },
  done:        { label: "Concluído",      color: "bg-emerald-400/15 text-emerald-400 border-emerald-400/25"},
  rejected:    { label: "Rejeitado",      color: "bg-red-400/15 text-red-400 border-red-400/25"         },
};

export function FeatureRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter]     = useState<string>("all");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get<Request[]>("/api/developer/feature-requests").then(data => {
      setRequests(data);
      setLoading(false);
    });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/api/developer/feature-requests/${id}`, { status });
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  const counts = STATUSES.reduce((acc, s) => ({
    ...acc, [s]: requests.filter(r => r.status === s).length,
  }), {} as Record<string, number>);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold text-lime-400 uppercase tracking-[0.2em] mb-1">Painel Developer</p>
        <h1 className="text-2xl font-black">Feature Requests</h1>
        <p className="text-white/30 text-sm mt-1">{requests.length} sugestão{requests.length !== 1 ? "ões" : ""} no total</p>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={() => setFilter("all")}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            filter === "all" ? "border-lime-400/30 bg-lime-400/10 text-lime-400" : "border-white/[0.08] text-white/30 hover:text-white/60"
          }`}>
          Todos ({requests.length})
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === s
                ? STATUS_META[s].color
                : "border-white/[0.08] text-white/30 hover:text-white/60"
            }`}>
            {STATUS_META[s].label} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} className="rounded-2xl border border-white/[0.07] bg-[#0d0d0d] p-5">
              <div className="flex items-start gap-4">
                {/* Votes */}
                <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                  <Star className="h-4 w-4 text-lime-400" />
                  <span className="text-sm font-bold text-lime-400">{req.votes}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{req.title}</p>
                  {req.description && <p className="text-xs text-white/40 mt-1 leading-relaxed">{req.description}</p>}
                  <p className="text-[10px] text-white/20 mt-2">
                    <span className="text-white/30 font-medium">{req.tenant_name}</span>
                    {" · "}{new Date(req.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                {/* Status selector */}
                <div className="relative shrink-0">
                  <div className="relative">
                    <select
                      value={req.status}
                      onChange={e => updateStatus(req.id, e.target.value)}
                      className={`appearance-none text-[11px] font-bold uppercase px-3 py-1.5 pr-6 rounded-full border cursor-pointer bg-transparent focus:outline-none transition-colors ${STATUS_META[req.status]?.color ?? "border-white/[0.08] text-white/30"}`}
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s} className="bg-[#111] text-white normal-case font-normal">
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
            <div className="py-16 text-center text-sm text-white/20">
              Nenhuma sugestão com esse status.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
