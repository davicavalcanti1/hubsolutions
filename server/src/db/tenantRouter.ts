/**
 * Tenant Router
 * 
 * Resolve qual banco de dados usar para cada tenant:
 * - db_tier = 'supabase' → client Supabase (cloud)
 * - db_tier = 'local'    → pool PostgreSQL local
 * 
 * Cache de configs para evitar lookup a cada request.
 */
import { Pool, PoolClient } from "pg";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { pool as hubPool } from "./pool.js";

// ── Cache de tenant configs ─────────────────────────────────────────────────
interface TenantConfig {
  id: string;
  slug: string;
  name: string;
  db_tier: "supabase" | "local";
  db_connection_string: string | null;
  plan_name: string;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  max_users: number;
  active: boolean;
  cachedAt: number;
}

const CACHE_TTL_MS = 30_000; // 30s
const configCache  = new Map<string, TenantConfig>();

export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  const cached = configCache.get(tenantId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached;

  const { rows } = await hubPool.query<TenantConfig>(`
    SELECT t.id, t.slug, t.name, t.db_tier, t.db_connection_string,
           t.storage_used_bytes, t.active,
           p.name as plan_name, p.storage_limit_bytes, p.max_users
    FROM tenants t
    JOIN plans p ON p.id = t.plan_id
    WHERE t.id = $1
  `, [tenantId]);

  if (!rows[0]) return null;
  const config = { ...rows[0], cachedAt: Date.now() };
  configCache.set(tenantId, config);
  return config;
}

export async function getTenantBySlug(slug: string): Promise<TenantConfig | null> {
  const { rows } = await hubPool.query<{ id: string }>(`SELECT id FROM tenants WHERE slug = $1`, [slug]);
  if (!rows[0]) return null;
  return getTenantConfig(rows[0].id);
}

export function invalidateCache(tenantId: string) {
  configCache.delete(tenantId);
}

// ── Pool de conexões locais por tenant ────────────────────────────────────────
// Tenants com db_tier='local' e db_connection_string própria têm pool dedicado.
// Tenants com db_tier='local' sem connection string compartilham o hub pool.
const localPools = new Map<string, Pool>();

function getLocalPool(config: TenantConfig): Pool {
  if (config.db_connection_string) {
    if (!localPools.has(config.id)) {
      localPools.set(config.id, new Pool({ connectionString: config.db_connection_string }));
    }
    return localPools.get(config.id)!;
  }
  return hubPool; // shared local pool
}

// ── Supabase clients por projeto ──────────────────────────────────────────────
// Por agora todos os tenants 'supabase' apontam para o mesmo projeto HubSolutions.
// Futuro: cada tenant pode ter seu próprio projeto Supabase.
const SUPABASE_URL            = process.env.SUPABASE_URL            || "";
const SUPABASE_SERVICE_ROLE   = process.env.SUPABASE_SERVICE_ROLE   || "";

let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
}

// ── Interface de query unificada ──────────────────────────────────────────────
export interface TenantDB {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  release?: () => void;
  tier: "supabase" | "local";
  tenantId: string;
}

export async function getTenantDB(tenantId: string): Promise<TenantDB | null> {
  const config = await getTenantConfig(tenantId);
  if (!config || !config.active) return null;

  if (config.db_tier === "local") {
    const localPool = getLocalPool(config);
    const client: PoolClient = await localPool.connect();
    return {
      tier: "local",
      tenantId,
      query: (sql, params) => client.query(sql, params as unknown[]).then(r => ({ rows: r.rows })),
      release: () => client.release(),
    };
  }

  // Supabase tier — usa rpc ou postgrest via admin client
  const sb = getSupabaseAdmin();
  return {
    tier: "supabase",
    tenantId,
    query: async (sql, params) => {
      const { data, error } = await sb.rpc("execute_sql", { query: sql, bindings: params ?? [] });
      if (error) throw new Error(error.message);
      return { rows: (data as Record<string, unknown>[]) ?? [] };
    },
  };
}
