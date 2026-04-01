import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantTheme } from "@/features/tenant/context/TenantThemeContext";
import type { Occurrence, OccurrenceStatus, TriageClassification } from "../types/occurrence";
import { statusConfig, statusTransitions, triageConfig, typeLabels, subtypeLabels } from "../types/occurrence";
import { ArrowLeft, Loader2, Clock } from "lucide-react";

function fmtDate(d: string | undefined | null): string {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return d; }
}

function StatusBadge({ status }: { status: OccurrenceStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export function OcorrenciaDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const { user } = useAuth();
  const { theme } = useTenantTheme();
  const primary = theme?.primary_color ?? "#2563eb";

  const [occ, setOcc] = useState<Occurrence | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triage, setTriage] = useState<TriageClassification | "">("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get<Occurrence>(`/api/ocorrencias/${id}`)
      .then(data => { setOcc(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const patchStatus = async (status: OccurrenceStatus) => {
    if (!occ) return;
    setSaving(true);
    const updated = await api.patch<Occurrence>(`/api/ocorrencias/${occ.id}`, { status, motivo });
    setOcc(updated);
    setMotivo("");
    setSaving(false);
  };

  const patchTriage = async () => {
    if (!occ || !triage) return;
    setSaving(true);
    const updated = await api.patch<Occurrence>(`/api/ocorrencias/${occ.id}`, { triagem: triage });
    setOcc(updated);
    setTriage("");
    setSaving(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  if (!occ) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
      Ocorrência não encontrada.
    </div>
  );

  const dados = occ.dados as any;
  const nextStatuses = statusTransitions[occ.status] ?? [];
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to={`/${slug}/ocorrencias`} className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold font-mono text-blue-600">#{occ.protocolo}</span>
          <StatusBadge status={occ.status} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Summary card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">
                {typeLabels[occ.tipo] ?? occ.tipo}
                {occ.subtipo ? ` · ${subtypeLabels[occ.subtipo] ?? occ.subtipo}` : ""}
              </p>
              <h2 className="text-xl font-black text-slate-900">
                {dados?.paciente?.nomeCompleto || dados?.paciente_nome_completo || "Sem nome"}
              </h2>
              {dados?.unidadeLocal && <p className="text-sm text-slate-400 mt-0.5">{dados.unidadeLocal}</p>}
            </div>
            {occ.triagem && (
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border shrink-0 ${triageConfig[occ.triagem].color}`}>
                {triageConfig[occ.triagem].label}
              </span>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Data do Evento</p>
              <p className="text-slate-900">{dados?.dataHoraEvento ? fmtDate(dados.dataHoraEvento) : "—"}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Registrada em</p>
              <p className="text-slate-900">{fmtDate(occ.criado_em)}</p>
            </div>
            {dados?.registrador?.setor && (
              <div>
                <p className="text-slate-400 text-xs mb-0.5">Setor</p>
                <p className="text-slate-900">{dados.registrador.setor}</p>
              </div>
            )}
            {dados?.registrador?.cargo && (
              <div>
                <p className="text-slate-400 text-xs mb-0.5">Cargo</p>
                <p className="text-slate-900">{dados.registrador.cargo}</p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {dados?.descricaoDetalhada && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 text-slate-900">Descrição</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{dados.descricaoDetalhada}</p>
          </div>
        )}

        {dados?.acaoImediata && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 text-slate-900">Ação Imediata</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{dados.acaoImediata}</p>
          </div>
        )}

        {dados?.houveDano && dados?.descricaoDano && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <h3 className="text-sm font-semibold mb-3 text-red-700">Dano Registrado</h3>
            <p className="text-sm text-red-600 leading-relaxed">{dados.descricaoDano}</p>
          </div>
        )}

        {/* Triage (admin only) */}
        {isAdmin && !occ.triagem && (occ.status === "registrada" || occ.status === "em_triagem") && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-sm font-semibold mb-4 text-amber-700">Classificar Triagem</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {(Object.keys(triageConfig) as TriageClassification[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTriage(triage === t ? "" : t)}
                  className={`text-left px-4 py-3 rounded-xl border text-xs transition-colors ${
                    triage === t
                      ? triageConfig[t].color
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <p className="font-semibold">{triageConfig[t].label}</p>
                  <p className="text-slate-500 mt-0.5">{triageConfig[t].description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={patchTriage}
              disabled={!triage || saving}
              className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-40"
            >
              {saving ? "Salvando..." : "Confirmar Triagem"}
            </button>
          </div>
        )}

        {/* Status transitions (admin only) */}
        {isAdmin && nextStatuses.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-4 text-slate-900">Avançar Status</h3>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Motivo / observação (opcional)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 mb-3"
            />
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map(s => (
                <button
                  key={s}
                  onClick={() => patchStatus(s)}
                  disabled={saving}
                  className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${statusConfig[s].bg} ${statusConfig[s].color}`}
                >
                  → {statusConfig[s].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {occ.historico_status.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-4 text-slate-900">Histórico de Status</h3>
            <div className="space-y-3">
              {[...occ.historico_status].reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <Clock className="h-3.5 w-3.5 text-slate-300 mt-0.5 shrink-0" />
                  <div>
                    <span className={`font-semibold ${statusConfig[h.de].color}`}>{statusConfig[h.de].label}</span>
                    {" → "}
                    <span className={`font-semibold ${statusConfig[h.para].color}`}>{statusConfig[h.para].label}</span>
                    {h.motivo && <p className="text-slate-400 mt-0.5">{h.motivo}</p>}
                    <p className="text-slate-300 mt-0.5">
                      {h.por} · {fmtDate(h.em)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
