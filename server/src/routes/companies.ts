import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import crypto from "crypto";

const router = Router();
router.use(requireAuth);

// GET /api/companies/me — minha empresa
router.get("/me", async (req: AuthRequest, res) => {
  const { rows } = await pool.query(`SELECT * FROM companies WHERE id = $1`, [req.user!.company_id]);
  res.json(rows[0] || null);
});

// GET /api/companies/me/members
router.get("/me/members", async (req: AuthRequest, res) => {
  const { rows } = await pool.query(
    `SELECT id, full_name, email, role, avatar_url, created_at FROM users WHERE company_id = $1 ORDER BY created_at`,
    [req.user!.company_id]
  );
  res.json(rows);
});

// GET /api/companies/me/modules
router.get("/me/modules", async (req: AuthRequest, res) => {
  const { rows } = await pool.query(
    `SELECT cm.*, m.name, m.description, m.price_monthly
     FROM company_modules cm JOIN modules m ON m.key = cm.module_key
     WHERE cm.company_id = $1`,
    [req.user!.company_id]
  );
  res.json(rows);
});

// POST /api/companies/me/modules/:key/toggle
router.post("/me/modules/:key/toggle", async (req: AuthRequest, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Sem permissão" }); return; }
  const { key } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM company_modules WHERE company_id = $1 AND module_key = $2`,
    [req.user!.company_id, key]
  );
  if (rows[0]) {
    const { rows: updated } = await pool.query(
      `UPDATE company_modules SET active = NOT active WHERE id = $1 RETURNING *`,
      [rows[0].id]
    );
    res.json(updated[0]);
  } else {
    const { rows: inserted } = await pool.query(
      `INSERT INTO company_modules (company_id, module_key, active) VALUES ($1, $2, true) RETURNING *`,
      [req.user!.company_id, key]
    );
    res.json(inserted[0]);
  }
});

// POST /api/companies/me/invitations
router.post("/me/invitations", async (req: AuthRequest, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Sem permissão" }); return; }
  const { email, role = "user" } = req.body;
  if (!email) { res.status(400).json({ error: "E-mail obrigatório" }); return; }
  const token = crypto.randomBytes(32).toString("hex");
  const { rows } = await pool.query(
    `INSERT INTO invitations (company_id, email, role, token) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user!.company_id, email, role, token]
  );
  res.json(rows[0]);
});

export default router;
