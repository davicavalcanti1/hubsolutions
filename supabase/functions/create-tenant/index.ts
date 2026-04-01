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
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: callerAuth } } = await userClient.auth.getUser();
    if (!callerAuth) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: callerProfile } = await adminClient
      .from("users")
      .select("role")
      .eq("supabase_user_id", callerAuth.id)
      .maybeSingle();

    if (callerProfile?.role !== "superadmin") {
      return new Response(
        JSON.stringify({ error: "Apenas superadmin pode criar empresas" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const {
      company_name,
      company_slug,
      company_email,
      admin_name,
      admin_email,
      admin_password,
      plan_name = "free",
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

    // Get plan id
    const { data: plan } = await adminClient
      .from("plans")
      .select("id")
      .eq("name", plan_name)
      .maybeSingle();

    // Create company
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({
        name:     company_name,
        slug:     company_slug,
        email:    company_email ?? null,
        plan_id:  plan?.id ?? null,
        active:   true,
      })
      .select()
      .single();

    if (companyError) {
      return new Response(
        JSON.stringify({ error: companyError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create admin user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email:         admin_email,
      password:      admin_password,
      email_confirm: true,
    });

    if (authError) {
      // Rollback company
      await adminClient.from("companies").delete().eq("id", company.id);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Insert admin into users table
    const { data: adminUser, error: insertError } = await adminClient
      .from("users")
      .insert({
        supabase_user_id: authData.user.id,
        full_name:        admin_name,
        email:            admin_email,
        role:             "admin",
        company_id:       company.id,
      })
      .select()
      .single();

    if (insertError) {
      // Rollback
      await adminClient.auth.admin.deleteUser(authData.user.id);
      await adminClient.from("companies").delete().eq("id", company.id);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
