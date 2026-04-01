import { Router, type Response } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireSuperadmin, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireSuperadmin);

function serverError(res: Response, err: unknown, ctx: string) {
  console.error(`[developer/${ctx}]`, err);
  res.status(500).json({ error: "Erro interno do servidor" });
}

// GET /api/developer/overview
router.get("/overview", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT count(*) FROM tenants WHERE active = true)                              as total_tenants,
        (SELECT count(*) FROM tenants WHERE created_at > now() - interval '30 days')   as new_tenants_30d,
        (SELECT count(*) FROM users WHERE role <> 'superadmin')                        as total_users,
        (SELECT sum(p.price_monthly) FROM tenants t
          JOIN plans p ON p.id = t.plan_id WHERE t.active)                             as mrr,
        (SELECT count(*) FROM feature_requests WHERE status = 'pending')               as pending_requests,
        (SELECT count(*) FROM feature_requests WHERE status = 'planned')               as planned_features,
        (SELECT sum(storage_used_bytes) FROM tenants)                                  as total_storage_used
    `);
    res.json(rows[0]);
  } catch (err) { serverError(res, err, "overview"); }
});

// GET /api/developer/tenants
router.get("/tenants", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.id, t.name, t.slug, t.email, t.active,
        t.storage_used_bytes, t.primary_color, t.display_name, t.logo_url, t.created_at,
        p.name as plan_name, p.price_monthly, p.storage_limit_bytes,
        (SELECT count(*) FROM users WHERE company_id = t.id)                    as user_count,
        (SELECT count(*) FROM company_modules WHERE company_id = t.id AND active) as active_modules,
        round(t.storage_used_bytes::numeric / NULLIF(p.storage_limit_bytes,0) * 100, 1) as storage_pct
      FROM tenants t
      JOIN plans p ON p.id = t.plan_id
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch (err) { serverError(res, err, "tenants"); }
});

// GET /api/developer/tenants/:id
router.get("/tenants/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.id, t.name, t.slug, t.email, t.active,
        t.storage_used_bytes, t.primary_color, t.secondary_color,
        t.display_name, t.logo_url, t.favicon_url, t.created_at,
        p.name as plan_name, p.price_monthly, p.storage_limit_bytes, p.max_users
      FROM tenants t JOIN plans p ON p.id = t.plan_id
      WHERE t.id = $1
    `, [req.params.id]);
    if (!rows[0]) { res.status(404).json({ error: "Empresa não encontrada" }); return; }

    const [{ rows: members }, { rows: modules }, { rows: requests }] = await Promise.all([
      pool.query(
        `SELECT id, full_name, email, role, created_at FROM users WHERE company_id = $1 ORDER BY created_at`,
        [req.params.id]
      ),
      pool.query(`
        SELECT cm.module_key, cm.active, m.name, m.description
        FROM company_modules cm JOIN modules m ON m.key = cm.module_key
        WHERE cm.company_id = $1 ORDER BY m.name`, [req.params.id]
      ),
      pool.query(
        `SELECT id, title, status, votes, created_at FROM feature_requests
         WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [req.params.id]
      ),
    ]);

    res.json({ ...rows[0], members, modules, recent_requests: requests });
  } catch (err) { serverError(res, err, "tenants/:id"); }
});

// PATCH /api/developer/tenants/:id
router.patch("/tenants/:id", async (req: AuthRequest, res) => {
  try {
    const { active, plan_name, primary_color, display_name } = req.body;
    const updates: string[] = [];
    const values: unknown[]  = [];
    let i = 1;

    if (typeof active === "boolean")   { updates.push(`active = $${i++}`);        values.push(active); }
    if (typeof primary_color === "string" && /^#[0-9a-fA-F]{6}$/.test(primary_color)) {
      updates.push(`primary_color = $${i++}`); values.push(primary_color);
    }
    if (typeof display_name === "string") {
      updates.push(`display_name = $${i++}`); values.push(display_name.slice(0, 100));
    }
    if (plan_name) {
      const { rows: p } = await pool.query(`SELECT id FROM plans WHERE name = $1`, [plan_name]);
      if (p[0]) { updates.push(`plan_id = $${i++}`); values.push(p[0].id); }
    }

    if (updates.length === 0) { res.status(400).json({ error: "Nada para atualizar" }); return; }
    values.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE tenants SET ${updates.join(", ")} WHERE id = $${i}
       RETURNING id, name, slug, email, active, storage_used_bytes,
                 primary_color, secondary_color, display_name, logo_url, created_at`,
      values
    );
    res.json(rows[0]);
  } catch (err) { serverError(res, err, "tenants/:id PATCH"); }
});

// GET /api/developer/feature-requests
router.get("/feature-requests", async (req, res) => {
  try {
    const ALLOWED = ["pending","reviewing","planned","in_progress","done","rejected"];
    const { status } = req.query;
    const where  = status && ALLOWED.includes(status as string) ? `WHERE fr.status = $1` : "";
    const params = where ? [status] : [];
    const { rows } = await pool.query(`
      SELECT fr.id, fr.title, fr.status, fr.votes, fr.created_at,
             t.name as tenant_name, t.slug as tenant_slug
      FROM feature_requests fr JOIN tenants t ON t.id = fr.tenant_id
      ${where} ORDER BY fr.votes DESC, fr.created_at DESC
    `, params);
    res.json(rows);
  } catch (err) { serverError(res, err, "feature-requests"); }
});

// PATCH /api/developer/feature-requests/:id
router.patch("/feature-requests/:id", async (req, res) => {
  try {
    const ALLOWED = ["pending","reviewing","planned","in_progress","done","rejected"];
    const { status } = req.body;
    if (!ALLOWED.includes(status)) { res.status(400).json({ error: "Status inválido" }); return; }
    const { rows } = await pool.query(
      `UPDATE feature_requests SET status = $1 WHERE id = $2 RETURNING id, title, status, votes`,
      [status, req.params.id]
    );
    if (!rows[0]) { res.status(404).json({ error: "Sugestão não encontrada" }); return; }
    res.json(rows[0]);
  } catch (err) { serverError(res, err, "feature-requests PATCH"); }
});

// GET /api/developer/plans
router.get("/plans", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, storage_limit_bytes, max_users, price_monthly FROM plans ORDER BY price_monthly`
    );
    res.json(rows);
  } catch (err) { serverError(res, err, "plans"); }
});

export default router;
