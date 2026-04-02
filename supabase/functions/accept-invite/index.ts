import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { token, full_name, supabase_user_id } = await req.json();

    if (!token || !full_name || !supabase_user_id) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: token, full_name, supabase_user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate token
    const { data: invitation } = await adminClient
      .from("invitations")
      .select("id, email, role, company_id, accepted, expires_at, companies:company_id(name)")
      .eq("token", token)
      .maybeSingle();

    if (!invitation) {
      return new Response(
        JSON.stringify({ error: "Convite inválido ou expirado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (invitation.accepted) {
      return new Response(
        JSON.stringify({ error: "Convite já foi aceito" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Convite expirado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Upsert — o trigger já pode ter criado a linha via signUp metadata
    const { data: newUser, error: insertError } = await adminClient
      .from("users")
      .upsert({
        supabase_user_id: supabase_user_id,
        full_name,
        email:      invitation.email,
        role:       invitation.role,
        company_id: invitation.company_id,
      }, { onConflict: "supabase_user_id" })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark invitation as accepted
    await adminClient
      .from("invitations")
      .update({ accepted: true })
      .eq("id", invitation.id);

    return new Response(
      JSON.stringify({ ok: true, user: newUser }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
