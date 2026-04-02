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

    const {
      company_name,
      company_slug,
      company_email,
      admin_name,
      admin_email,
      admin_password,
      plan_name = "free",
      module_keys = [] as string[],
    } = await req.json();

    if (!company_name || !company_slug || !admin_name || !admin_email || !admin_password) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check slug uniqueness
    const { count: slugCount } = await adminClient
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("slug", company_slug);

    if ((slugCount ?? 0) > 0) {
      return new Response(
        JSON.stringify({ error: "Slug já está em uso" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get plan id (optional — column may not exist yet)
    const { data: plan } = await adminClient
      .from("plans")
      .select("id")
      .eq("name", plan_name)
      .maybeSingle();

    // Build insert payload — only include plan_id if column exists (plan found)
    const companyPayload: Record<string, unknown> = {
      name:  company_name,
      slug:  company_slug,
      email: company_email ?? null,
    };
    if (plan?.id) companyPayload.plan_id = plan.id;

    // Create company
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert(companyPayload)
      .select()
      .single();

    if (companyError) {
      return new Response(
        JSON.stringify({ error: companyError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create admin user in Supabase Auth (metadata lido pelo trigger)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email:         admin_email,
      password:      admin_password,
      email_confirm: true,
      user_metadata: { full_name: admin_name, role: "admin", company_id: company.id },
    });

    if (authError) {
      await adminClient.from("companies").delete().eq("id", company.id);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Upsert admin — o trigger já pode ter criado a linha via metadata
    const { data: adminUser, error: insertError } = await adminClient
      .from("users")
      .upsert({
        supabase_user_id: authData.user.id,
        full_name:        admin_name,
        email:            admin_email,
        role:             "admin",
        company_id:       company.id,
      }, { onConflict: "supabase_user_id" })
      .select()
      .single();

    if (insertError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      await adminClient.from("companies").delete().eq("id", company.id);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Activate selected modules
    if (Array.isArray(module_keys) && module_keys.length > 0) {
      await adminClient.from("company_modules").insert(
        module_keys.map((key: string) => ({
          company_id: company.id,
          module_key: key,
          active: true,
        }))
      );
    }

    return new Response(
      JSON.stringify({ company, admin: adminUser }),
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
