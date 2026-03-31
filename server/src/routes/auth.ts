import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { signToken, requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/register — cria empresa + usuário admin
router.post("/register", async (req, res) => {
  const { company_name, company_slug, company_email, full_name, email, password } = req.body;
  if (!company_name || !company_slug || !full_name || !email || !password) {
    res.status(400).json({ error: "Campos obrigatórios faltando" });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [company] } = await client.query(
      `INSERT INTO companies (name, slug, email) VALUES ($1, $2, $3) RETURNING *`,
      [company_name, company_slug, company_email || null]
    );
    const hash = await bcrypt.hash(password, 10);
    const { rows: [user] } = await client.query(
      `INSERT INTO users (company_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, 'admin') RETURNING id, company_id, full_name, email, role`,
      [company.id, full_name, email, hash]
    );
    await client.query("COMMIT");
    const token = signToken({ id: user.id, company_id: user.company_id, role: user.role, email: user.email });
    res.json({ token, user, company });
  } catch (err: any) {
    await client.query("ROLLBACK");
    if (err.code === "23505") res.status(409).json({ error: "E-mail ou slug já em uso" });
    else res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "E-mail e senha são obrigatórios" }); return; }
  const { rows } = await pool.query(
    `SELECT u.*, c.name as company_name, c.slug as company_slug, c.logo_url as company_logo
     FROM users u JOIN companies c ON c.id = u.company_id WHERE u.email = $1`, [email]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: "E-mail ou senha incorretos" });
    return;
  }
  const token = signToken({ id: user.id, company_id: user.company_id, role: user.role, email: user.email });
  const { password_hash: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.company_id, u.full_name, u.email, u.role, u.avatar_url, u.created_at,
            c.name as company_name, c.slug as company_slug, c.logo_url as company_logo
     FROM users u JOIN companies c ON c.id = u.company_id WHERE u.id = $1`,
    [req.user!.id]
  );
  if (!rows[0]) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json(rows[0]);
});

export default router;
