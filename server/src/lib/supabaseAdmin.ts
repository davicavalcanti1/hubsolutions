import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL         = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("[FATAL] SUPABASE_URL ou SUPABASE_SERVICE_ROLE não definidos.");
  process.exit(1);
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});
