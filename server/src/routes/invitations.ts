import { Router } from "express";
import { pool } from "../db/pool.js";
import jwt from "jsonwebtoken";

const router = Router();
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

// GET /api/invitations/:token — valida o convite (público)
router.get("/:token", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.email, i.role, i.expires_at, i.accepted, c.name as company_name, c.id as company_id
       FROM invitations i JOIN companies c ON c.id = i.company_id WHERE i.token = $1`,
      [req.params.token]
    );
    const inv = rows[0];
    if (!inv)             { res.status(404).json({ error: "Convite não encontrado" }); return; }
    if (inv.accepted)     { res.status(410).json({ error: "Convite já utilizado" }); return; }
    if (new Date(inv.expires_at) < new Date()) { res.status(410).json({ error: "Convite expirado" }); return; }

    res.json({ email: inv.email, company_name: inv.company_name, company_id: inv.company_id, role: inv.role });
  } catch (err) {
    console.error("[invitations/get]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/invitations/:token/accept
// O usuário já fez signUp no Supabase — aqui só criamos o perfil local e marcamos o convite
router.post("/:token/accept", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) { res.status(401).json({ error: "Não autenticado" }); return; }

  const authToken = header.slice(7);
  let supabaseId: string;
  let supabaseEmail: string;

  try {
    const payload = jwt.verify(authToken, SUPABASE_JWT_SECRET) as { sub: string; email: string };
    supabaseId    = payload.sub;
    supabaseEmail = payload.email;
  } catch {
    res.status(401).json({ error: "Token inválido" }); return;
  }

  const { full_name } = req.body;
  if (!full_name) { res.status(400).json({ error: "Nome é obrigatório" }); return; }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT * FROM invitations WHERE token = $1 AND accepted = false AND expires_at > now()`,
      [req.params.token]
    );
    if (!rows[0]) { res.status(410).json({ error: "Convite inválido ou expirado" }); return; }
    const inv = rows[0];

    // Email do Supabase deve bater com o email do convite
    if (supabaseEmail.toLowerCase() !== inv.email.toLowerCase()) {
      res.status(403).json({ error: "Este convite é para outro e-mail" }); return;
    }

    const { rows: [user] } = await client.query(
      `INSERT INTO users (supabase_user_id, company_id, full_name, email, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, supabase_user_id, company_id, full_name, email, role`,
      [supabaseId, inv.company_id, full_name, supabaseEmail, inv.role]
    );

    await client.query(`UPDATE invitations SET accepted = true WHERE id = $1`, [inv.id]);
    await client.query("COMMIT");

    res.json({ user });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("[invitations/accept]", err);
    if (err.code === "23505") res.status(409).json({ error: "E-mail já cadastrado" });
    else res.status(500).json({ error: "Erro interno ao aceitar convite" });
  } finally {
    client.release();
  }
});

export default router;
