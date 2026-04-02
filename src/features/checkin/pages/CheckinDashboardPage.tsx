import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  UserCheck, Loader2, Clock, CheckCircle2, Volume2, AlertTriangle,
  XCircle, Flag, Search, BarChart3, Timer, Users, TrendingUp, MapPin,
  Tv2, Plus, Trash2, ExternalLink, Copy, Check,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCheckin, useDashboardStats, computeDashboard } from "@/features/checkin/hooks/useCheckin";
import type { QueueEntry } from "@/features/checkin/hooks/useCheckin";
import { checkinService } from "@/features/checkin/services/checkinService";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantTheme } from "@/features/tenant/context/TenantThemeContext";
import { supabase } from "@/integrations/supabase/client";

// ── Constants ─────────────────────────────────────────────────────────────────

const SLA_AUSENTE_MIN = 10;
const WARN_CHECKIN_MIN = 30;

const ATENDIMENTO_LABELS: Record<string, string> = {
  normal: "Normal", crianca: "Criança", gestante: "Gestante",
  idoso: "Idoso", pcd: "PCD", autista: "Autista",
};
const ATENDIMENTO_EMOJI: Record<string, string> = {
  normal: "👤", crianca: "⭐", gestante: "🤰", idoso: "👴", pcd: "♿", autista: "🧩",
};
const PRIORITY_TYPES = ["crianca", "gestante", "idoso", "pcd", "autista"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPriority(e: QueueEntry) { return PRIORITY_TYPES.includes(e.tipo_atendimento); }
function minutesSince(iso?: string) { if (!iso) return 0; return Math.floor((Date.now() - new Date(iso).getTime()) / 60000); }
function maskCpf(cpf?: string) {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

// ── Patient Card ──────────────────────────────────────────────────────────────

function PatientCard({ entry, index, actions }: { entry: QueueEntry; index?: number; actions: React.ReactNode }) {
  const priority = isPriority(entry);
  const minsSince = minutesSince(entry.checkin_em);
  const isOld = minsSince > WARN_CHECKIN_MIN;
  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${priority ? "border-red-200 bg-red-50/60 border-l-4 border-l-red-500" : "border-slate-100 bg-white hover:bg-slate-50/40"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {index !== undefined && (
            <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${priority ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span>
          )}
          <span className={`font-bold text-sm truncate ${priority ? "text-red-900" : "text-slate-900"}`}>{entry.nome}</span>
          {priority && (
            <span className="text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
              {ATENDIMENTO_EMOJI[entry.tipo_atendimento]} {ATENDIMENTO_LABELS[entry.tipo_atendimento]}
            </span>
          )}
        </div>
        <span className={`text-[10px] flex-shrink-0 font-medium px-2 py-0.5 rounded-full border ${isOld ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
          {formatDistanceToNow(new Date(entry.checkin_em), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
        {entry.cpf && <span>CPF: {maskCpf(entry.cpf)}</span>}
        {entry.exame_nome && <span>🔬 {entry.exame_nome}</span>}
        {entry.origem && <span className="capitalize">📍 {entry.origem.replace("_", " ")}</span>}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">{actions}</div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({ title, color, icon, count, children, emptyMsg }: {
  title: string; color: string; icon: React.ReactNode; count: number; children: React.ReactNode; emptyMsg: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border bg-slate-50/60 overflow-hidden min-h-[300px]">
      <div className={`flex items-center justify-between px-4 py-3 border-b ${color}`}>
        <div className="flex items-center gap-2 font-semibold text-sm">{icon}{title}</div>
        <span className="text-xs font-bold px-2 py-0.5 bg-white/70 rounded-full">{count}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(100vh-380px)]">
        {count === 0
          ? <p className="text-xs text-center text-muted-foreground py-8">{emptyMsg}</p>
          : children}
      </div>
    </div>
  );
}

// ── TV Management Tab ─────────────────────────────────────────────────────────

interface TVEntry { id: string; name: string; slug: string; active: boolean; orientacao: string; last_seen_at?: string; }

function TVTab({ companyId, slug }: { companyId: string; slug: string }) {
  const [tvs, setTvs] = useState<TVEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadTvs = async () => {
    const { data } = await checkinService.listTVs(companyId);
    setTvs((data || []) as TVEntry[]);
    setLoading(false);
  };

  useEffect(() => { loadTvs(); }, [companyId]);

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    return (Date.now() - new Date(lastSeen).getTime()) < 2 * 60 * 1000;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) return;
    setCreating(true); setError(null);
    const { error: err } = await checkinService.createTV({
      company_id: companyId,
      name: newName.trim(),
      slug: newSlug.trim().toLowerCase().replace(/\s+/g, "-"),
      orientacao: "horizontal",
    });
    if (err) { setError((err as any).message); setCreating(false); return; }
    setNewName(""); setNewSlug("");
    setCreating(false);
    loadTvs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta TV?")) return;
    await checkinService.deleteTV(id);
    loadTvs();
  };

  const copyUrl = (tvSlug: string, id: string) => {
    const url = `${window.location.origin}/checkin-tv/${tvSlug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const broadcastTest = async () => {
    await checkinService.broadcastCall("Paciente Teste", companyId);
  };

  return (
    <div className="space-y-6 mt-4">
      {/* TV list */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">TVs configuradas</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : tvs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-slate-100">
            Nenhuma TV configurada. Adicione uma abaixo.
          </div>
        ) : (
          <div className="space-y-3">
            {tvs.map(tv => {
              const online = isOnline(tv.last_seen_at);
              const tvUrl = `${window.location.origin}/checkin-tv/${tv.slug}`;
              return (
                <div key={tv.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Tv2 className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{tv.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">/checkin-tv/{tv.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className="text-[10px] text-slate-400">{online ? "Online" : "Offline"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => copyUrl(tv.slug, tv.id)}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors" title="Copiar URL">
                      {copiedId === tv.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a href={tvUrl} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors" title="Abrir TV">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button onClick={() => handleDelete(tv.id)}
                      className="p-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-500 transition-colors" title="Remover">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Test broadcast */}
      {tvs.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-indigo-100 bg-indigo-50">
          <Tv2 className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-800">Testar chamada</p>
            <p className="text-xs text-indigo-600">Envia "Paciente Teste" para todas as TVs desta empresa</p>
          </div>
          <button onClick={broadcastTest}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <Volume2 className="h-4 w-4 inline mr-1.5" />
            Testar
          </button>
        </div>
      )}

      {/* Add TV form */}
      <div className="border border-slate-200 rounded-2xl p-5 bg-white">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Adicionar TV
        </h3>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nome da TV</label>
              <input type="text" placeholder="Ex: TV Recepção" value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Slug (URL)</label>
              <input type="text" placeholder={`${slug}-tv`} value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={creating || !newName.trim() || !newSlug.trim()}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {creating ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : <Plus className="h-4 w-4 inline mr-2" />}
            Criar TV
          </button>
        </form>
        {newSlug && (
          <p className="mt-2 text-[11px] text-slate-400">
            URL: <span className="font-mono text-slate-600">{window.location.origin}/checkin-tv/{newSlug}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CheckinDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { theme } = useTenantTheme();
  const primary = theme?.primary_color ?? "#6366f1";

  const { entries, loading, actionError, stats, callPatient, confirmPatient, finalizePatient, markAbsent, arrivedAtClinic } = useCheckin();
  const { data: dashRaw = [] } = useDashboardStats(user?.company_id ?? undefined);
  const dash = computeDashboard(dashRaw);

  const [tab, setTab] = useState<"kanban" | "dashboard" | "tv">("kanban");
  const [search, setSearch] = useState("");
  const [connected, setConnected] = useState(true);

  // Connection ping
  useEffect(() => {
    const ch = (supabase as any).channel("checkin-ping");
    ch.on("system" as any, {} as any, (s: any) => setConnected(s === "SUBSCRIBED"))
      .subscribe((s: string) => setConnected(s === "SUBSCRIBED"));
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filterSearch = (list: QueueEntry[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(e => e.nome.toLowerCase().includes(q) || (e.cpf || "").includes(q.replace(/\D/g, "")));
  };

  const aguardando = filterSearch(entries.filter(e => ["aguardando", "chegou"].includes(e.status)));
  const aCaminho   = filterSearch(entries.filter(e => e.status === "confirmado"));
  const chamados   = filterSearch(entries.filter(e => ["chamado", "em_atendimento"].includes(e.status)));
  const overdue    = entries.filter(e => e.status === "chamado" && minutesSince(e.chamado_em) >= SLA_AUSENTE_MIN);

  const tabs = [
    { key: "kanban",    label: "Fila",      icon: <Users className="h-4 w-4" /> },
    { key: "dashboard", label: "Dashboard", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "tv",        label: "TV",        icon: <Tv2 className="h-4 w-4" /> },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={`/${slug}`} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold mb-0.5" style={{ color: primary }}>
                <UserCheck className="h-3.5 w-3.5" /> Check-in
              </div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                Fila de Atendimento
                <span className="relative flex h-2.5 w-2.5" title={connected ? "Tempo real ativo" : "Sem conexão"}>
                  {connected ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </>
                  ) : <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400" />}
                </span>
              </h1>
            </div>
          </div>

          {/* Link for patient QR */}
          <a href={`/checkin/${slug}`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl px-3 py-2 bg-white transition-colors">
            <ExternalLink className="h-3.5 w-3.5" />
            Totem do Paciente
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-5 animate-in fade-in duration-300">
        {/* Error banner */}
        {actionError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {actionError}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Aguardando", value: stats.aguardando, icon: <Clock className="h-4 w-4"/>,       color: "text-blue-700",   bg: "bg-blue-50 border-blue-100"   },
            { label: "A Caminho",  value: stats.aCaminho,   icon: <MapPin className="h-4 w-4"/>,      color: "text-violet-700", bg: "bg-violet-50 border-violet-100" },
            { label: "Chamados",   value: stats.chamados,   icon: <Volume2 className="h-4 w-4"/>,     color: "text-amber-700",  bg: "bg-amber-50 border-amber-100"  },
            { label: "Prioridade", value: stats.prioridade, icon: <Flag className="h-4 w-4"/>,        color: "text-red-700",    bg: "bg-red-50 border-red-100"      },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 flex items-center gap-3 ${s.bg}`}>
              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${s.bg} ${s.color}`}>{s.icon}</div>
              <div>
                <p className={`text-[11px] font-medium ${s.color}/70`}>{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* SLA Alerts */}
        {overdue.map(e => (
          <div key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="flex-1 text-sm font-medium text-amber-900">
              ⚠️ <strong>{e.nome}</strong> chamado há {minutesSince(e.chamado_em)} min sem confirmação
            </p>
            <div className="flex gap-2">
              <button onClick={() => confirmPatient(e.id)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
              </button>
              <button onClick={() => markAbsent(e.id)}
                className="px-3 py-1.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" /> Ausente
              </button>
            </div>
          </div>
        ))}

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-white shadow-sm p-1 gap-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t.key ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
          {tab === "kanban" && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Buscar por nome ou CPF..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
            </div>
          )}
        </div>

        {/* ── KANBAN ── */}
        {tab === "kanban" && (
          loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KanbanColumn title="Aguardando" color="bg-blue-50 border-blue-100 text-blue-800"
                icon={<Clock className="h-4 w-4" />} count={aguardando.length} emptyMsg="Nenhum paciente aguardando.">
                {aguardando.map((entry, i) => (
                  <PatientCard key={entry.id} entry={entry} index={i} actions={
                    <>
                      <button onClick={() => callPatient(entry)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold">
                        <Volume2 className="h-3 w-3" /> Chamar
                      </button>
                      <button onClick={() => markAbsent(entry.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold">
                        <XCircle className="h-3 w-3" /> Ausente
                      </button>
                    </>
                  } />
                ))}
              </KanbanColumn>

              <KanbanColumn title="A Caminho" color="bg-violet-50 border-violet-100 text-violet-800"
                icon={<MapPin className="h-4 w-4" />} count={aCaminho.length} emptyMsg="Nenhum paciente confirmado remotamente.">
                {aCaminho.map(entry => (
                  <PatientCard key={entry.id} entry={entry} actions={
                    <button onClick={() => arrivedAtClinic(entry.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                      <MapPin className="h-3 w-3" /> Registrar Chegada
                    </button>
                  } />
                ))}
              </KanbanColumn>

              <KanbanColumn title="Chamados" color="bg-amber-50 border-amber-100 text-amber-800"
                icon={<Volume2 className="h-4 w-4" />} count={chamados.length} emptyMsg="Nenhum paciente chamado ainda.">
                {chamados.map(entry => (
                  <PatientCard key={entry.id} entry={entry} actions={
                    <>
                      {entry.status === "chamado" && (
                        <button onClick={() => confirmPatient(entry.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Confirmar
                        </button>
                      )}
                      {entry.status === "em_atendimento" && (
                        <button onClick={() => finalizePatient(entry.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Finalizar
                        </button>
                      )}
                      <button onClick={() => callPatient(entry)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold">
                        <Volume2 className="h-3 w-3" /> Chamar novamente
                      </button>
                      <button onClick={() => markAbsent(entry.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold">
                        <XCircle className="h-3 w-3" /> Ausente
                      </button>
                    </>
                  } />
                ))}
              </KanbanColumn>
            </div>
          )
        )}

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Atendidos Hoje",    value: `${dash.atendidosHoje}`,    sub: `de ${dash.totalHoje} hoje`,         icon: <CheckCircle2 className="h-5 w-5 text-emerald-600"/>, bg: "bg-emerald-50", border: "border-l-emerald-500" },
                { label: "Tempo Médio Geral", value: `${dash.avgWait} min`,       sub: "do check-in ao atendimento",        icon: <Timer className="h-5 w-5 text-blue-600"/>, bg: "bg-blue-50", border: "border-l-blue-500" },
                { label: "T. Médio Priorit.", value: `${dash.avgPriority} min`,  sub: "pacientes prioritários",            icon: <Flag className="h-5 w-5 text-red-600"/>, bg: "bg-red-50", border: "border-l-red-500" },
                { label: "Prioritários Hoje", value: `${dash.prioritariosHoje}`, sub: "30 dias",                           icon: <TrendingUp className="h-5 w-5 text-violet-600"/>, bg: "bg-violet-50", border: "border-l-violet-500" },
              ].map(k => (
                <div key={k.label} className={`relative overflow-hidden border-l-4 ${k.border} border border-gray-100 rounded-2xl shadow-sm bg-white`}>
                  <div className={`absolute top-0 right-0 p-3 ${k.bg} rounded-bl-2xl`}>{k.icon}</div>
                  <div className="p-4 pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{k.label}</p>
                    <p className="text-3xl font-black text-gray-900 mt-1">{k.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-100 shadow-sm bg-white p-5">
                <p className="text-sm font-semibold mb-4">Pacientes por Dia (últimos 7 dias)</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dash.porDia} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="dia" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0/0.1)", fontSize: 12 }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={32} />
                      <Bar dataKey="prioritarios" name="Prioritários" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 shadow-sm bg-white p-5">
                <p className="text-sm font-semibold mb-4">Pacientes por Semana (últimas 4 semanas)</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dash.porSemana} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="semana" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0/0.1)", fontSize: 12 }} />
                      <Bar dataKey="total" name="Pacientes" fill="#8b5cf6" radius={[4,4,0,0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 shadow-sm bg-white p-5">
              <p className="text-sm font-semibold mb-4">Tempo Médio por Tipo de Atendimento (30 dias)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="py-2 text-left font-semibold">Tipo</th>
                      <th className="py-2 text-right font-semibold">Pacientes</th>
                      <th className="py-2 text-right font-semibold">Tempo Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dash.tipoBreakdown.map(row => (
                      <tr key={row.tipo} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium">{ATENDIMENTO_EMOJI[row.tipo]} {ATENDIMENTO_LABELS[row.tipo] || row.tipo}</td>
                        <td className="py-2.5 text-right font-mono text-gray-700">{row.total}</td>
                        <td className="py-2.5 text-right">
                          <span className={`font-mono font-semibold ${row.avgWait === 0 ? "text-gray-400" : row.avgWait > 30 ? "text-red-600" : row.avgWait > 15 ? "text-amber-600" : "text-emerald-600"}`}>
                            {row.avgWait === 0 ? "—" : `${row.avgWait} min`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TV ── */}
        {tab === "tv" && user?.company_id && slug && (
          <TVTab companyId={user.company_id} slug={slug} />
        )}
      </div>
    </div>
  );
}
