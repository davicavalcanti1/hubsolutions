/**
 * Tenant Hub routes — acesso público ao hub white-label
 * GET /api/hub/:slug — config pública do tenant (sem dados sensíveis)
 */
import { Router } from "express";
import { pool as hubPool } from "../db/pool.js";

const router = Router();

/** Garante que URLs de mídia sejam apenas https, prevenindo javascript: e outros vetores */
function safeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

// GET /api/hub/:slug — carrega config de tema e módulos ativos (público)
router.get("/:slug", async (req, res) => {
  try {
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

    const tenant = rows[0];

    const { rows: modules } = await hubPool.query(`
      SELECT cm.module_key, cm.active, m.name, m.description
      FROM company_modules cm JOIN modules m ON m.key = cm.module_key
      WHERE cm.company_id = $1 AND cm.active = true
      ORDER BY m.name
    `, [tenant.id]);

    res.json({
      id:              tenant.id,
      slug:            tenant.slug,
      display_name:    tenant.display_name,
      logo_url:        safeUrl(tenant.logo_url),
      favicon_url:     safeUrl(tenant.favicon_url),
      primary_color:   /^#[0-9a-fA-F]{6}$/.test(tenant.primary_color) ? tenant.primary_color : "#a3e635",
      secondary_color: /^#[0-9a-fA-F]{6}$/.test(tenant.secondary_color) ? tenant.secondary_color : "#ffffff",
      plan_name:       tenant.plan_name,
      active_modules:  modules,
    });
  } catch (err) {
    console.error("[tenantHub]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
