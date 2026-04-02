import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, startOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { checkinService } from "@/features/checkin/services/checkinService";
import { useAuth } from "@/contexts/AuthContext";

export interface QueueEntry {
  id: string;
  company_id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  data_nasc?: string;
  sexo?: "M" | "F";
  tipo_agendamento: "agendado" | "a_agendar";
  tipo_atendimento: "normal" | "crianca" | "gestante" | "idoso" | "pcd" | "autista";
  exame_nome?: string;
  horario_agendamento?: string;
  status: "aguardando" | "confirmado" | "chegou" | "chamado" | "em_atendimento" | "finalizado" | "ausente";
  origem?: string;
  fila_virtual: boolean;
  checkin_em: string;
  chamado_em?: string;
  atendido_em?: string;
  finalizado_em?: string;
  token_publico: string;
}

const PRIORITY_TYPES = ["crianca", "gestante", "idoso", "pcd", "autista"];

export function useCheckin() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchEntries = useCallback(async () => {
    if (!user?.company_id) return;

    const { data, error } = await checkinService.listQueue(user.company_id);
    if (error) { setActionError("Erro ao carregar fila"); return; }

    const sorted = ((data || []) as QueueEntry[]).sort((a, b) => {
      const ap = PRIORITY_TYPES.includes(a.tipo_atendimento) ? 0 : 1;
      const bp = PRIORITY_TYPES.includes(b.tipo_atendimento) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return new Date(a.checkin_em).getTime() - new Date(b.checkin_em).getTime();
    });

    setEntries(sorted);
    setLoading(false);
  }, [user?.company_id]);

  useEffect(() => {
    if (!user?.company_id) return;
    fetchEntries();
    channelRef.current = checkinService.subscribeToQueue(user.company_id, fetchEntries);
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user?.company_id, fetchEntries]);

  const callPatient = useCallback(async (entry: QueueEntry) => {
    setActionError(null);
    const { error } = await checkinService.updateStatus(entry.id, "chamado", {
      chamado_em: new Date().toISOString(),
    });
    if (error) { setActionError("Erro ao chamar paciente"); return; }
    if (user?.company_id) await checkinService.broadcastCall(entry.nome, user.company_id);
  }, [user?.company_id]);

  const confirmPatient = useCallback(async (entryId: string) => {
    setActionError(null);
    const { error } = await checkinService.updateStatus(entryId, "em_atendimento", {
      atendido_em: new Date().toISOString(),
    });
    if (error) setActionError("Erro ao confirmar paciente");
  }, []);

  const finalizePatient = useCallback(async (entryId: string) => {
    setActionError(null);
    const { error } = await checkinService.updateStatus(entryId, "finalizado", {
      finalizado_em: new Date().toISOString(),
    });
    if (error) setActionError("Erro ao finalizar atendimento");
  }, []);

  const markAbsent = useCallback(async (entryId: string) => {
    setActionError(null);
    const { error } = await checkinService.updateStatus(entryId, "ausente");
    if (error) setActionError("Erro ao marcar ausente");
  }, []);

  const arrivedAtClinic = useCallback(async (entryId: string) => {
    setActionError(null);
    const { error } = await checkinService.updateStatus(entryId, "chegou");
    if (error) setActionError("Erro ao registrar chegada");
  }, []);

  const stats = {
    aguardando: entries.filter(e => ["aguardando", "chegou"].includes(e.status)).length,
    aCaminho: entries.filter(e => e.status === "confirmado").length,
    chamados: entries.filter(e => ["chamado", "em_atendimento"].includes(e.status)).length,
    prioridade: entries.filter(e => PRIORITY_TYPES.includes(e.tipo_atendimento) && e.status !== "finalizado").length,
  };

  return {
    entries,
    loading,
    actionError,
    stats,
    callPatient,
    confirmPatient,
    finalizePatient,
    markAbsent,
    arrivedAtClinic,
    refetch: fetchEntries,
  };
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export type DashboardEntry = {
  id: string;
  tipo_atendimento: string;
  checkin_em: string;
  atendido_em?: string;
  finalizado_em?: string;
  status: string;
  fila_virtual: boolean;
};

export function useDashboardStats(companyId?: string) {
  return useQuery({
    queryKey: ["checkin-dashboard", companyId],
    queryFn: async () => {
      if (!companyId) return [] as DashboardEntry[];
      const since = subDays(new Date(), 30).toISOString();
      const { data, error } = await checkinService.getDashboardStats(companyId, since);
      if (error) throw error;
      return (data || []) as DashboardEntry[];
    },
    enabled: !!companyId,
    refetchInterval: 60_000,
  });
}

const PRIORITY_SET = new Set(["crianca", "gestante", "idoso", "pcd", "autista"]);

export function computeDashboard(entries: DashboardEntry[]) {
  const today = startOfDay(new Date());
  const todayEntries = entries.filter(e => new Date(e.checkin_em) >= today);
  const atendidosHoje = todayEntries.filter(e => e.status === "finalizado").length;

  const withWait = entries.filter(e => e.atendido_em);
  const avgWait = withWait.length === 0 ? 0 : Math.round(
    withWait.reduce((acc, e) =>
      acc + (new Date(e.atendido_em!).getTime() - new Date(e.checkin_em).getTime()) / 60000, 0
    ) / withWait.length
  );

  const priorityWait = withWait.filter(e => PRIORITY_SET.has(e.tipo_atendimento));
  const normalWait   = withWait.filter(e => !PRIORITY_SET.has(e.tipo_atendimento));

  const avgPriority = priorityWait.length === 0 ? 0 : Math.round(
    priorityWait.reduce((acc, e) =>
      acc + (new Date(e.atendido_em!).getTime() - new Date(e.checkin_em).getTime()) / 60000, 0
    ) / priorityWait.length
  );
  const avgNormal = normalWait.length === 0 ? 0 : Math.round(
    normalWait.reduce((acc, e) =>
      acc + (new Date(e.atendido_em!).getTime() - new Date(e.checkin_em).getTime()) / 60000, 0
    ) / normalWait.length
  );

  const prioritariosHoje = todayEntries.filter(e => PRIORITY_SET.has(e.tipo_atendimento)).length;

  const porDia: { dia: string; total: number; prioritarios: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day  = startOfDay(subDays(new Date(), i));
    const next = startOfDay(subDays(new Date(), i - 1));
    const dayEntries = entries.filter(e => { const d = new Date(e.checkin_em); return d >= day && d < next; });
    porDia.push({
      dia: format(day, "EEE dd/MM", { locale: ptBR }),
      total: dayEntries.length,
      prioritarios: dayEntries.filter(e => PRIORITY_SET.has(e.tipo_atendimento)).length,
    });
  }

  const porSemana: { semana: string; total: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const ws = startOfDay(subDays(new Date(), (i + 1) * 7));
    const we = startOfDay(subDays(new Date(), i * 7));
    const wEntries = entries.filter(e => { const d = new Date(e.checkin_em); return d >= ws && d < we; });
    porSemana.push({ semana: `Sem. ${format(ws, "dd/MM", { locale: ptBR })}`, total: wEntries.length });
  }

  const tipoBreakdown = ["crianca", "gestante", "idoso", "pcd", "autista", "normal"].map(tipo => {
    const te = entries.filter(e => e.tipo_atendimento === tipo);
    const tw = te.filter(e => e.atendido_em);
    const avg = tw.length === 0 ? 0 : Math.round(
      tw.reduce((acc, e) =>
        acc + (new Date(e.atendido_em!).getTime() - new Date(e.checkin_em).getTime()) / 60000, 0
      ) / tw.length
    );
    return { tipo, total: te.length, avgWait: avg };
  });

  return { atendidosHoje, avgWait, avgPriority, avgNormal, prioritariosHoje, porDia, porSemana, tipoBreakdown, totalHoje: todayEntries.length };
}
