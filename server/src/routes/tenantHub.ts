/**
 * Tenant Hub routes — acesso público ao hub white-label
 * GET /api/hub/:slug — config pública do tenant (sem dados sensíveis)
 */
import { Router } from "express";
import { pool as hubPool } from "../db/pool.js";

const router = Router();

// GET /api/hub/:slug — carrega config de tema e módulos ativos (público)
router.get("/:slug", async (req, res) => {
  const { rows } = await hubPool.query(`
    SELECT
      t.id, t.slug, t.display_name, t.logo_url, t.favicon_url,
      t.primary_color, t.secondary_color, t.active,
      p.name as plan_name
    FROM tenants t
    JOIN plans p ON p.id = t.plan_id
    WHERE t.slug = $1 AND t.active = true
  `, [req.params.slug]);

  if (!rows[0]) { res.status(404).json({ error: "Empresa não encontrada" }); return; }

  const { rows: modules } = await hubPool.query(`
    SELECT cm.module_key, cm.active, m.name, m.description
    FROM company_modules cm JOIN modules m ON m.key = cm.module_key
    WHERE cm.company_id = $1 AND cm.active = true
    ORDER BY m.name
  `, [rows[0].id]);

  res.json({ ...rows[0], active_modules: modules });
});

export default router;
