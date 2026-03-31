/**
 * Middleware: TenantContext
 * 
 * 1. Valida o JWT do Supabase
 * 2. Resolve tenant_id a partir do supabase_user_id
 * 3. Carrega config do tenant (plano, tier, quotas)
 * 4. Injeta `req.tenant` e `req.tenantUser` para as rotas
 */
import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { pool as hubPool } from "../db/pool.js";
import { getTenantConfig, type TenantConfig } from "../db/tenantRouter.js";

const SUPABASE_URL  = process.env.SUPABASE_URL  || "";
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || "";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) _supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  return _supabase;
}

export interface TenantUser {
  supabase_user_id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role: "admin" | "user";
}

export interface TenantRequest extends Request {
  tenantUser?: TenantUser;
  tenant?: TenantConfig;
}

export async function requireTenant(req: TenantRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  // 1. Valida JWT via Supabase
  const token = header.slice(7);
  const { data: { user }, error } = await getSupabase().auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Token inválido" });
    return;
  }

  // 2. Resolve tenant via tenant_users
  const { rows } = await hubPool.query<TenantUser>(
    `SELECT * FROM tenant_users WHERE supabase_user_id = $1`,
    [user.id]
  );
  if (!rows[0]) {
    res.status(403).json({ error: "Usuário não vinculado a nenhum tenant" });
    return;
  }

  // 3. Carrega config do tenant
  const tenantConfig = await getTenantConfig(rows[0].tenant_id);
  if (!tenantConfig || !tenantConfig.active) {
    res.status(403).json({ error: "Tenant inativo ou não encontrado" });
    return;
  }

  req.tenantUser = rows[0];
  req.tenant     = tenantConfig;
  next();
}

// ── Quota checker ─────────────────────────────────────────────────────────────
export function requireQuota(estimatedBytes = 0) {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    const tenant = req.tenant;
    if (!tenant) { res.status(500).json({ error: "Tenant não carregado" }); return; }

    const used  = Number(tenant.storage_used_bytes);
    const limit = Number(tenant.storage_limit_bytes);

    if (used + estimatedBytes > limit) {
      res.status(402).json({
        error: "Limite de armazenamento atingido",
        used_bytes:  used,
        limit_bytes: limit,
        plan:        tenant.plan_name,
        upgrade_url: "/hub/settings/plan",
      });
      return;
    }
    next();
  };
}
