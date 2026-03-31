import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { signToken } from "../middleware/auth.js";

const router = Router();

// GET /api/invitations/:token — valida o convite
router.get("/:token", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.*, c.name as company_name FROM invitations i
     JOIN companies c ON c.id = i.company_id WHERE i.token = $1`,
    [req.params.token]
  );
  const inv = rows[0];
  if (!inv) { res.status(404).json({ error: "Convite não encontrado" }); return; }
  if (inv.accepted) { res.status(410).json({ error: "Convite já utilizado" }); return; }
  if (new Date(inv.expires_at) < new Date()) { res.status(410).json({ error: "Convite expirado" }); return; }
  res.json({ email: inv.email, company_name: inv.company_name, company_id: inv.company_id, role: inv.role });
});

// POST /api/invitations/:token/accept
router.post("/:token/accept", async (req, res) => {
  const { full_name, password } = req.body;
  if (!full_name || !password) { res.status(400).json({ error: "Nome e senha são obrigatórios" }); return; }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT * FROM invitations WHERE token = $1 AND accepted = false AND expires_at > now()`,
      [req.params.token]
    );
    if (!rows[0]) { res.status(410).json({ error: "Convite inválido ou expirado" }); return; }
    const inv = rows[0];
    const hash = await bcrypt.hash(password, 10);
    const { rows: [user] } = await client.query(
      `INSERT INTO users (company_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_id, full_name, email, role`,
      [inv.company_id, full_name, inv.email, hash, inv.role]
    );
    await client.query(`UPDATE invitations SET accepted = true WHERE id = $1`, [inv.id]);
    await client.query("COMMIT");
    const token = signToken({ id: user.id, company_id: user.company_id, role: user.role, email: user.email });
    res.json({ token, user });
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err.code === "23505") res.status(409).json({ error: "E-mail já cadastrado" });
    else res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
