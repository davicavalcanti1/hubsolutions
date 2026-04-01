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

    // Plan padrão: free
    const { rows: [freePlan] } = await client.query(
      `SELECT id FROM plans WHERE name = 'free' LIMIT 1`
    );

    const { rows: [company] } = await client.query(
      `INSERT INTO companies (name, slug, email, plan_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [company_name, company_slug, company_email || null, freePlan?.id ?? null]
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

// GET /api/auth/has-superadmin — verifica se já existe developer
router.get("/has-superadmin", async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id FROM users WHERE role = 'superadmin' LIMIT 1`);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error("[auth/has-superadmin]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/auth/setup-superadmin
// Cria o primeiro developer (superadmin) da plataforma. Só funciona UMA vez.
router.post("/setup-superadmin", async (req, res) => {
  try {
    const { rows: existing } = await pool.query(`SELECT id FROM users WHERE role = 'superadmin'`);
    if (existing.length > 0) {
      res.status(409).json({ error: "Superadmin já existe" }); return;
    }

    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) {
      res.status(400).json({ error: "Campos obrigatórios: full_name, email, password" }); return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres" }); return;
    }

    // Cria usuário no Supabase Auth via Admin API
    const { supabaseAdmin } = await import("../lib/supabaseAdmin.js");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error("[auth/setup-superadmin] Supabase error:", authError);
      res.status(500).json({ error: authError?.message || "Erro ao criar usuário no Supabase" }); return;
    }

    // Cria perfil local como superadmin (sem company_id)
    const { rows: [user] } = await pool.query(
      `INSERT INTO users (supabase_user_id, company_id, full_name, email, role)
       VALUES ($1, NULL, $2, $3, 'superadmin')
       RETURNING id, supabase_user_id, company_id, full_name, email, role`,
      [authData.user.id, full_name, email.toLowerCase()]
    );

    res.json({ user });
  } catch (err) {
    console.error("[auth/setup-superadmin]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
