import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

import { useTenantTheme } from "@/features/tenant/context/TenantThemeContext";
import {
  PlusCircle, AlertTriangle, CheckCircle2, Clock,
  ShieldAlert, TrendingUp, ClipboardList, ArrowRight, Loader2,
} from "lucide-react";
import type { Occurrence, OccurrenceStatus, OccurrenceType } from "../types/occurrence";
import { statusConfig, typeLabels } from "../types/occurrence";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function StatusBadge({ status }: { status: OccurrenceStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function KPI({ label, value, icon: Icon, accent }: {
  label: string; value: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-slate-500">{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 border border-slate-200">
          <Icon className="h-4 w-4 text-slate-400" style={accent ? { color: accent } : undefined} />
        </div>
      </div>
      <p className="text-3xl font-black tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export function OcorrenciasPage() {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useTenantTheme();
  const navigate = useNavigate();
  const primary = theme?.primary_color ?? "#2563eb";

  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Occurrence[]>("/api/ocorrencias").then(data => {
      setOccurrences(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const total       = occurrences.length;
  const pending     = occurrences.filter(o => o.status === "registrada" || o.status === "em_triagem").length;
  const inProgress  = occurrences.filter(o => o.status === "em_analise" || o.status === "acao_em_andamento").length;
  const completed   = occurrences.filter(o => o.status === "concluida").length;
  const semTriagem  = occurrences.filter(o => !o.triagem && (o.status === "registrada" || o.status === "em_triagem")).length;

  const sentinelas  = occurrences.filter(o =>
    o.triagem === "evento_sentinela" && o.status !== "concluida" && o.status !== "improcedente"
  );

  const recent = [...occurrences]
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, 10);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to={`/${slug}`} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
              ← Hub
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-900">Central de Ocorrências</span>
          </div>
          <button
            onClick={() => navigate(`/${slug}/ocorrencias/nova`)}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border transition-colors text-white"
            style={{ background: primary, borderColor: primary }}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Nova Ocorrência
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Evento Sentinela alert */}
        {sentinelas.length > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">
                {sentinelas.length} evento(s) sentinela em aberto — requer atenção imediata
              </p>
            </div>
            <Link
              to={`/${slug}/ocorrencias/kanban`}
              className="text-xs text-red-600 hover:text-red-800 underline shrink-0"
            >
              Ver no Kanban
            </Link>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPI label="Total"          value={total}      icon={TrendingUp}    />
          <KPI label="Pendentes"      value={pending}    icon={AlertTriangle} />
          <KPI label="Em Andamento"   value={inProgress} icon={Clock}         />
          <KPI label="Concluídas"     value={completed}  icon={CheckCircle2}  />
          <KPI label="Sem Triagem"    value={semTriagem} icon={ShieldAlert}   />
        </div>

        {/* Atalhos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Histórico",     path: "historico",  icon: ClipboardList },
            { label: "Kanban",        path: "kanban",     icon: TrendingUp    },
          ].map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={`/${slug}/ocorrencias/${path}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <Icon className="h-5 w-5 text-slate-300 group-hover:text-blue-600 mb-3 transition-colors" />
              <p className="text-sm font-medium text-slate-900">{label}</p>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 group-hover:text-blue-600 transition-colors">
                Acessar <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>

        {/* Recent occurrences */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Registros Recentes</h2>
            <Link to={`/${slug}/ocorrencias/historico`} className="text-xs text-blue-600 hover:text-blue-800 transition-colors">
              Ver todos →
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {recent.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  Nenhuma ocorrência registrada ainda.
                </div>
              ) : recent.map(occ => (
                <Link
                  key={occ.id}
                  to={`/${slug}/ocorrencias/${occ.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        #{occ.protocolo}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {typeLabels[occ.tipo as OccurrenceType] ?? occ.tipo}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 truncate">
                      {(occ.dados as any)?.paciente?.nomeCompleto ||
                       (occ.dados as any)?.paciente_nome_completo ||
                       "Sem nome"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={occ.status} />
                    <span className="text-[10px] text-slate-400">
                      {timeAgo(occ.criado_em)}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-transparent group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
