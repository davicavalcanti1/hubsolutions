import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl =
  (window as any)._env_?.SUPABASE_URL || (import.meta.env.VITE_SUPABASE_URL as string);
const supabaseAnonKey =
  (window as any)._env_?.SUPABASE_ANON_KEY || (import.meta.env.VITE_SUPABASE_ANON_KEY as string);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const SUPABASE_URL = supabaseUrl;
