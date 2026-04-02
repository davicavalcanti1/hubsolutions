import { supabase } from "@/integrations/supabase/client";

export const checkinService = {
  listQueue: (companyId: string) =>
    (supabase as any)
      .from("checkin_queue")
      .select("*")
      .eq("company_id", companyId)
      .in("status", ["aguardando", "chegou", "confirmado", "chamado", "em_atendimento"])
      .order("checkin_em", { ascending: true }),

  updateStatus: (entryId: string, status: string, extra?: Record<string, unknown>) =>
    (supabase as any)
      .from("checkin_queue")
      .update({ status, ...extra })
      .eq("id", entryId),

  subscribeToQueue: (companyId: string, onChange: () => void) =>
    (supabase as any)
      .channel(`checkin-queue-${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkin_queue", filter: `company_id=eq.${companyId}` },
        onChange
      )
      .subscribe(),

  broadcastCall: async (nome: string, companyId: string) => {
    const ch = (supabase as any).channel("totem-checkin");
    await ch.send({ type: "broadcast", event: "call", payload: { nome, company_id: companyId } });
    supabase.removeChannel(ch);
  },

  getDashboardStats: (companyId: string, since: string) =>
    (supabase as any)
      .from("checkin_queue")
      .select("id, tipo_atendimento, checkin_em, atendido_em, finalizado_em, status, fila_virtual")
      .eq("company_id", companyId)
      .gte("checkin_em", since),

  getCompanyBySlug: (slug: string) =>
    (supabase as any)
      .from("companies")
      .select("id, name, logo_url, primary_color")
      .eq("slug", slug)
      .maybeSingle(),

  getTVBySlug: (slug: string) =>
    (supabase as any)
      .from("checkin_tvs")
      .select("*, companies:company_id(name, logo_url, primary_color)")
      .eq("slug", slug)
      .maybeSingle(),

  listTVs: (companyId: string) =>
    (supabase as any)
      .from("checkin_tvs")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),

  createTV: (payload: { company_id: string; name: string; slug: string; orientacao?: string }) =>
    (supabase as any).from("checkin_tvs").insert(payload).select().single(),

  deleteTV: (id: string) =>
    (supabase as any).from("checkin_tvs").delete().eq("id", id),

  updateTVHeartbeat: (id: string) =>
    (supabase as any)
      .from("checkin_tvs")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", id),
};
