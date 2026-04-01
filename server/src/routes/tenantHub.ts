/**
 * Tenant Hub routes — acesso público ao hub white-label
 * GET /api/hub/:slug — config pública da empresa (sem dados sensíveis)
 */
import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

function safeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

// GET /api/hub/:slug
router.get("/:slug", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.id, c.slug, c.name, c.display_name, c.logo_url, c.favicon_url,
        c.primary_color, c.secondary_color, c.active,
        p.name as plan_name
      FROM companies c
      JOIN plans p ON p.id = c.plan_id
      WHERE c.slug = $1 AND c.active = true
    `, [req.params.slug]);

    if (!rows[0]) { res.status(404).json({ error: "Empresa não encontrada" }); return; }

    const company = rows[0];

    const { rows: modules } = await pool.query(`
      SELECT cm.module_key, cm.active, m.name, m.description
      FROM company_modules cm JOIN modules m ON m.key = cm.module_key
      WHERE cm.company_id = $1 AND cm.active = true
      ORDER BY m.name
    `, [company.id]);

    res.json({
      id:              company.id,
      slug:            company.slug,
      display_name:    company.display_name ?? company.name,
      logo_url:        safeUrl(company.logo_url),
      favicon_url:     safeUrl(company.favicon_url),
      primary_color:   /^#[0-9a-fA-F]{6}$/.test(company.primary_color ?? "") ? company.primary_color : "#a3e635",
      secondary_color: /^#[0-9a-fA-F]{6}$/.test(company.secondary_color ?? "") ? company.secondary_color : "#ffffff",
      plan_name:       company.plan_name,
      active_modules:  modules,
    });
  } catch (err) {
    console.error("[tenantHub]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
