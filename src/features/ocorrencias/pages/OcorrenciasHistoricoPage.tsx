import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Occurrence, OccurrenceStatus, OccurrenceType } from "../types/occurrence";
import { statusConfig, typeLabels } from "../types/occurrence";
import { ArrowLeft, Search, Loader2 } from "lucide-react";

export function OcorrenciasHistoricoPage() {
  const { slug } = useParams<{ slug: string }>();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [tipoFilter, setTipoFilter]   = useState<OccurrenceType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<OccurrenceStatus | "all">("all");

  useEffect(() => {
    supabase
      .from("occurrences")
      .select("*")
      .order("criado_em", { ascending: false })
      .then(({ data }) => { setOccurrences((data as any) ?? []); setLoading(false); }, () => setLoading(false));
  }, []);

  const filtered = occurrences.filter(o => {
    const dados = o.dados as any;
    const nome  = dados?.paciente?.nomeCompleto ?? dados?.paciente_nome_completo ?? "";
    const q     = search.toLowerCase();
    const matchSearch = o.protocolo.toLowerCase().includes(q) || nome.toLowerCase().includes(q);
    const matchTipo   = tipoFilter   === "all" || o.tipo   === tipoFilter;
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchTipo && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to={`/${slug}/ocorrencias`} className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold text-slate-900">Histórico de Ocorrências</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por protocolo ou paciente..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <select
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value as OccurrenceType | "all")}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400"
          >
            <option value="all">Todos os tipos</option>
            {(Object.keys(typeLabels) as OccurrenceType[]).map(t => (
              <option key={t} value={t}>{typeLabels[t]}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as OccurrenceStatus | "all")}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400"
          >
            <option value="all">Todos os status</option>
            {(Object.keys(statusConfig) as OccurrenceStatus[]).map(s => (
              <option key={s} value={s}>{statusConfig[s].label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50">
              <span>Protocolo</span>
              <span>Tipo</span>
              <span>Paciente/Envolvido</span>
              <span>Status</span>
              <span>Data</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">Nenhuma ocorrência encontrada.</div>
              ) : filtered.map(occ => {
                const dados = occ.dados as any;
                const nome  = dados?.paciente?.nomeCompleto ?? dados?.paciente_nome_completo ?? "—";
                const cfg   = statusConfig[occ.status];
                return (
                  <Link
                    key={occ.id}
                    to={`/${slug}/ocorrencias/${occ.id}`}
                    className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 items-center px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      #{occ.protocolo}
                    </span>
                    <span className="text-sm text-slate-600 truncate">{typeLabels[occ.tipo] ?? occ.tipo}</span>
                    <span className="text-sm text-slate-600 truncate">{nome}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {(() => { try { return new Date(occ.criado_em).toLocaleDateString("pt-BR"); } catch { return "—"; } })()}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
