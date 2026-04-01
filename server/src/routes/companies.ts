import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireCompany, type AuthRequest } from "../middleware/auth.js";
import crypto from "crypto";

const router = Router();
router.use(requireAuth);
router.use(requireCompany); // superadmin não acessa rotas de empresa via este router

// GET /api/companies/me — minha empresa
router.get("/me", async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, email, logo_url, primary_color, secondary_color, created_at FROM companies WHERE id = $1`,
      [req.user!.company_id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error("[companies/me]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/companies/me/members — apenas admin
router.get("/me/members", async (req: AuthRequest, res) => {
  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Sem permissão" }); return;
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, role, avatar_url, created_at FROM users WHERE company_id = $1 ORDER BY created_at`,
      [req.user!.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("[companies/me/members]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/companies/me/modules
router.get("/me/modules", async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cm.module_key, cm.active, m.name, m.description, m.price_monthly
       FROM company_modules cm JOIN modules m ON m.key = cm.module_key
       WHERE cm.company_id = $1`,
      [req.user!.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("[companies/me/modules]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/companies/me/modules/:key/toggle — apenas admin
router.post("/me/modules/:key/toggle", async (req: AuthRequest, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Sem permissão" }); return; }
  try {
    const { key } = req.params;
    const { rows } = await pool.query(
      `SELECT id FROM company_modules WHERE company_id = $1 AND module_key = $2`,
      [req.user!.company_id, key]
    );
    if (rows[0]) {
      const { rows: updated } = await pool.query(
        `UPDATE company_modules SET active = NOT active WHERE id = $1 RETURNING module_key, active`,
        [rows[0].id]
      );
      res.json(updated[0]);
    } else {
      const { rows: inserted } = await pool.query(
        `INSERT INTO company_modules (company_id, module_key, active) VALUES ($1, $2, true) RETURNING module_key, active`,
        [req.user!.company_id, key]
      );
      res.json(inserted[0]);
    }
  } catch (err) {
    console.error("[companies/me/modules/toggle]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/companies/me/invitations — apenas admin
router.post("/me/invitations", async (req: AuthRequest, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Sem permissão" }); return; }
  try {
    const { email, role = "user" } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "E-mail obrigatório" }); return;
    }
    if (!["admin", "user"].includes(role)) {
      res.status(400).json({ error: "Role inválida. Use 'admin' ou 'user'" }); return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    const { rows } = await pool.query(
      `INSERT INTO invitations (company_id, email, role, token) VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, created_at`,
      [req.user!.company_id, email.toLowerCase().trim(), role, token]
    );
    // Retorna o token apenas na criação — nunca em listagens futuras
    res.json({ ...rows[0], token });
  } catch (err: any) {
    console.error("[companies/me/invitations]", err);
    if (err.code === "23505") res.status(409).json({ error: "Convite já enviado para este e-mail" });
    else res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
