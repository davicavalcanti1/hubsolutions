/**
 * Auth routes
 *
 * O Supabase cuida de login/registro/reset de senha.
 * Este router só gerencia o perfil local (empresa, role) vinculado ao Supabase user.
 */
import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import jwt from "jsonwebtoken";

const router = Router();

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

// GET /api/auth/me — retorna perfil completo do usuário autenticado
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.supabase_user_id, u.company_id, u.full_name, u.email, u.role, u.avatar_url, u.created_at,
              c.name     AS company_name,
              c.slug     AS company_slug,
              c.logo_url AS company_logo
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
      [req.user!.id]
    );
    if (!rows[0]) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json(rows[0]);
  } catch (err) {
    console.error("[auth/me]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/auth/complete-registration
// Chamado após o signUp no Supabase para criar empresa + perfil local
router.post("/complete-registration", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) { res.status(401).json({ error: "Não autenticado" }); return; }

  const token = header.slice(7);
  let supabaseId: string;
  let supabaseEmail: string;

  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET) as { sub: string; email: string };
    supabaseId    = payload.sub;
    supabaseEmail = payload.email;
  } catch {
    res.status(401).json({ error: "Token inválido" }); return;
  }

  // Impede re-registro
  const { rows: existing } = await pool.query(
    `SELECT id FROM users WHERE supabase_user_id = $1`, [supabaseId]
  );
  if (existing[0]) { res.status(409).json({ error: "Perfil já configurado" }); return; }

  const { company_name, company_slug, company_email, full_name } = req.body;
  if (!company_name || !company_slug || !full_name) {
    res.status(400).json({ error: "Campos obrigatórios: company_name, company_slug, full_name" }); return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: [company] } = await client.query(
      `INSERT INTO companies (name, slug, email) VALUES ($1, $2, $3) RETURNING *`,
      [company_name, company_slug, company_email || null]
    );

    const { rows: [user] } = await client.query(
      `INSERT INTO users (supabase_user_id, company_id, full_name, email, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, supabase_user_id, company_id, full_name, email, role`,
      [supabaseId, company.id, full_name, supabaseEmail]
    );

    await client.query("COMMIT");
    res.json({ user, company });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("[auth/complete-registration]", err);
    if (err.code === "23505") res.status(409).json({ error: "E-mail ou slug já em uso" });
    else res.status(500).json({ error: "Erro interno ao criar conta" });
  } finally {
    client.release();
  }
});

// POST /api/auth/setup-superadmin
// Só funciona se não existir nenhum superadmin. Use uma vez após criar no Supabase.
router.post("/setup-superadmin", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) { res.status(401).json({ error: "Não autenticado" }); return; }

  const token = header.slice(7);
  let supabaseId: string;
  let supabaseEmail: string;

  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET) as { sub: string; email: string };
    supabaseId    = payload.sub;
    supabaseEmail = payload.email;
  } catch {
    res.status(401).json({ error: "Token inválido" }); return;
  }

  try {
    const { rows: existing } = await pool.query(`SELECT id FROM users WHERE role = 'superadmin'`);
    if (existing.length > 0) {
      res.status(409).json({ error: "Superadmin já existe" }); return;
    }

    const { full_name = "Developer" } = req.body;
    const { rows: [user] } = await pool.query(
      `INSERT INTO users (supabase_user_id, company_id, full_name, email, role)
       VALUES ($1, NULL, $2, $3, 'superadmin')
       RETURNING id, supabase_user_id, company_id, full_name, email, role`,
      [supabaseId, full_name, supabaseEmail]
    );
    res.json({ user });
  } catch (err) {
    console.error("[auth/setup-superadmin]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
