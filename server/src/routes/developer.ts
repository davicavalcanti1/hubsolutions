/**
 * Developer panel routes — acesso restrito a role 'superadmin'
 * Controle total da plataforma
 */
import { Router } from "express";
import { pool as hubPool } from "../db/pool.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

function requireSuperadmin(req: AuthRequest, res: any, next: any) {
  if (req.user?.role !== "superadmin") {
    res.status(403).json({ error: "Acesso restrito ao painel developer" });
    return;
  }
  next();
}
router.use(requireSuperadmin);

// GET /api/developer/overview
router.get("/overview", async (_req, res) => {
  const { rows } = await hubPool.query(`
    SELECT
      (SELECT count(*) FROM tenants WHERE active = true)                    as total_tenants,
      (SELECT count(*) FROM tenants WHERE created_at > now() - interval '30 days') as new_tenants_30d,
      (SELECT count(*) FROM tenant_users)                                   as total_users,
      (SELECT sum(p.price_monthly) FROM tenants t JOIN plans p ON p.id = t.plan_id WHERE t.active) as mrr,
      (SELECT count(*) FROM feature_requests WHERE status = 'pending')      as pending_requests,
      (SELECT count(*) FROM feature_requests WHERE status = 'planned')      as planned_features,
      (SELECT sum(storage_used_bytes) FROM tenants)                         as total_storage_used,
      (SELECT count(*) FROM tenants WHERE db_tier = 'local')                as local_tenants,
      (SELECT count(*) FROM tenants WHERE db_tier = 'supabase')             as cloud_tenants
  `);
  res.json(rows[0]);
});

// GET /api/developer/tenants
router.get("/tenants", async (_req, res) => {
  const { rows } = await hubPool.query(`
    SELECT
      t.id, t.name, t.slug, t.email, t.db_tier, t.active,
      t.storage_used_bytes, t.primary_color, t.display_name, t.logo_url,
      t.created_at,
      p.name as plan_name, p.price_monthly, p.storage_limit_bytes,
      (SELECT count(*) FROM tenant_users WHERE tenant_id = t.id)  as user_count,
      (SELECT count(*) FROM company_modules WHERE company_id = t.id AND active) as active_modules,
      round(t.storage_used_bytes::numeric / NULLIF(p.storage_limit_bytes,0) * 100, 1) as storage_pct
    FROM tenants t
    JOIN plans p ON p.id = t.plan_id
    ORDER BY t.created_at DESC
  `);
  res.json(rows);
});

// GET /api/developer/tenants/:id
router.get("/tenants/:id", async (req, res) => {
  const { rows } = await hubPool.query(`
    SELECT t.*, p.name as plan_name, p.price_monthly, p.storage_limit_bytes,
           p.max_users
    FROM tenants t JOIN plans p ON p.id = t.plan_id
    WHERE t.id = $1
  `, [req.params.id]);
  if (!rows[0]) { res.status(404).json({ error: "Tenant não encontrado" }); return; }

  const [{ rows: members }, { rows: modules }, { rows: requests }] = await Promise.all([
    hubPool.query(`SELECT id, full_name, email, role, created_at FROM tenant_users WHERE tenant_id = $1`, [req.params.id]),
    hubPool.query(`
      SELECT cm.*, m.name, m.description FROM company_modules cm
      JOIN modules m ON m.key = cm.module_key WHERE cm.company_id = $1`, [req.params.id]),
    hubPool.query(`SELECT * FROM feature_requests WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 10`, [req.params.id]),
  ]);

  res.json({ ...rows[0], members, modules, recent_requests: requests });
});

// PATCH /api/developer/tenants/:id — editar tenant
router.patch("/tenants/:id", async (req, res) => {
  const { active, plan_name, db_tier, primary_color, display_name } = req.body;
  const updates: string[] = [];
  const values: unknown[]  = [];
  let i = 1;

  if (active !== undefined)       { updates.push(`active = $${i++}`);        values.push(active); }
  if (db_tier !== undefined)      { updates.push(`db_tier = $${i++}`);       values.push(db_tier); }
  if (primary_color !== undefined){ updates.push(`primary_color = $${i++}`); values.push(primary_color); }
  if (display_name !== undefined) { updates.push(`display_name = $${i++}`);  values.push(display_name); }
  if (plan_name) {
    const { rows: p } = await hubPool.query(`SELECT id FROM plans WHERE name = $1`, [plan_name]);
    if (p[0]) { updates.push(`plan_id = $${i++}`); values.push(p[0].id); }
  }

  if (updates.length === 0) { res.status(400).json({ error: "Nada para atualizar" }); return; }
  values.push(req.params.id);
  const { rows } = await hubPool.query(
    `UPDATE tenants SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`, values
  );
  res.json(rows[0]);
});

// GET /api/developer/feature-requests
router.get("/feature-requests", async (req, res) => {
  const { status } = req.query;
  const where = status ? `WHERE fr.status = $1` : "";
  const params = status ? [status] : [];
  const { rows } = await hubPool.query(`
    SELECT fr.*, t.name as tenant_name, t.slug as tenant_slug
    FROM feature_requests fr JOIN tenants t ON t.id = fr.tenant_id
    ${where} ORDER BY fr.votes DESC, fr.created_at DESC
  `, params);
  res.json(rows);
});

// PATCH /api/developer/feature-requests/:id
router.patch("/feature-requests/:id", async (req, res) => {
  const { status } = req.body;
  const { rows } = await hubPool.query(
    `UPDATE feature_requests SET status = $1 WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  res.json(rows[0]);
});

// GET /api/developer/plans
router.get("/plans", async (_req, res) => {
  const { rows } = await hubPool.query(`SELECT * FROM plans ORDER BY price_monthly`);
  res.json(rows);
});

export default router;
