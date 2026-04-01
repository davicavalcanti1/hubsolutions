import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireAdmin, requireCompany, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireCompany);

// GET /api/admin/usage
router.get("/usage", async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT count(*) FROM users WHERE company_id = $1) as user_count,
        (SELECT count(*) FROM company_modules WHERE company_id = $1 AND active) as active_modules,
        (SELECT count(*) FROM invitations WHERE company_id = $1 AND accepted = false AND expires_at > now()) as pending_invitations
    `, [req.user!.company_id]);
    res.json(rows[0]);
  } catch (err) {
    console.error("[admin/usage]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/admin/plans
router.get("/plans", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, storage_limit_bytes, max_users, price_monthly FROM plans ORDER BY price_monthly`
    );
    res.json(rows);
  } catch (err) {
    console.error("[admin/plans]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/admin/members
router.get("/members", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, role, created_at FROM users WHERE company_id = $1 ORDER BY created_at`,
      [req.user!.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("[admin/members]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/admin/members/:id
router.delete("/members/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: "Não pode remover a si mesmo" }); return;
    }
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user!.company_id]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: "Membro não encontrado" }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/members/delete]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
