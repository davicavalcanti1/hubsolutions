import { Router, type Response } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireSuperadmin, type AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import crypto from "crypto";

const router = Router();
router.use(requireAuth);
router.use(requireSuperadmin);

function serverError(res: Response, err: unknown, ctx: string) {
  console.error(`[developer/${ctx}]`, err);
  res.status(500).json({ error: "Erro interno do servidor" });
}

// GET /api/developer/overview
router.get("/overview", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT count(*) FROM companies WHERE active = true)                                  as total_tenants,
        (SELECT count(*) FROM companies WHERE created_at > now() - interval '30 days')        as new_tenants_30d,
        (SELECT count(*) FROM users WHERE role <> 'superadmin')                               as total_users,
        (SELECT coalesce(sum(p.price_monthly), 0) FROM companies c
          JOIN plans p ON p.id = c.plan_id WHERE c.active)                                    as mrr,
        (SELECT count(*) FROM feature_requests WHERE status = 'pending')                      as pending_requests,
        (SELECT count(*) FROM feature_requests WHERE status = 'planned')                      as planned_features,
        (SELECT coalesce(sum(storage_used_bytes), 0) FROM companies)                          as total_storage_used
    `);
    res.json(rows[0]);
  } catch (err) { serverError(res, err, "overview"); }
});

// GET /api/developer/tenants
router.get("/tenants", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.id, c.name, c.slug, c.email, c.active,
        c.storage_used_bytes, c.primary_color, c.display_name, c.logo_url, c.created_at,
        p.name as plan_name, p.price_monthly, p.storage_limit_bytes,
        (SELECT count(*) FROM users WHERE company_id = c.id)                        as user_count,
        (SELECT count(*) FROM company_modules WHERE company_id = c.id AND active)   as active_modules,
        round(c.storage_used_bytes::numeric / NULLIF(p.storage_limit_bytes, 0) * 100, 1) as storage_pct
      FROM companies c
      JOIN plans p ON p.id = c.plan_id
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) { serverError(res, err, "tenants"); }
});

// POST /api/developer/tenants — cria empresa + admin
router.post("/tenants", async (req: AuthRequest, res) => {
  const { company_name, company_slug, company_email, admin_email, admin_name, admin_password, plan_name } = req.body;

  if (!company_name || !company_slug || !admin_email || !admin_name || !admin_password) {
    res.status(400).json({ error: "Campos obrigatórios: company_name, company_slug, admin_email, admin_name, admin_password" });
    return;
  }
  if (admin_password.length < 8) {
    res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verifica se slug já existe
    const { rows: slugCheck } = await client.query(`SELECT id FROM companies WHERE slug = $1`, [company_slug]);
    if (slugCheck[0]) { res.status(409).json({ error: "Slug já em uso" }); return; }

    // Verifica se email já tem perfil local
    const { rows: emailCheck } = await client.query(`SELECT id FROM users WHERE email = $1`, [admin_email.toLowerCase()]);
    if (emailCheck[0]) { res.status(409).json({ error: "E-mail já cadastrado na plataforma" }); return; }

    // Plano
    const planQuery = plan_name
      ? await client.query(`SELECT id FROM plans WHERE name = $1`, [plan_name])
      : await client.query(`SELECT id FROM plans WHERE name = 'free' LIMIT 1`);
    const planId = planQuery.rows[0]?.id ?? null;

    // 1. Cria empresa
    const { rows: [company] } = await client.query(
      `INSERT INTO companies (name, slug, email, plan_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [company_name, company_slug, company_email || null, planId]
    );

    // 2. Cria usuário no Supabase Auth via Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: admin_email.toLowerCase(),
      password: admin_password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      await client.query("ROLLBACK");
      console.error("[developer/tenants POST] Supabase auth error:", authError);
      res.status(500).json({ error: authError?.message || "Erro ao criar usuário no Supabase" });
      return;
    }

    // 3. Cria perfil local com role admin
    const { rows: [user] } = await client.query(
      `INSERT INTO users (supabase_user_id, company_id, full_name, email, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, full_name, email, role`,
      [authData.user.id, company.id, admin_name, admin_email.toLowerCase()]
    );

    await client.query("COMMIT");
    res.status(201).json({ company, admin: user });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("[developer/tenants POST]", err);
    if (err.code === "23505") res.status(409).json({ error: "Slug ou e-mail já em uso" });
    else res.status(500).json({ error: "Erro interno ao criar empresa" });
  } finally {
    client.release();
  }
});

// POST /api/developer/tenants/:id/members — adicionar membro a uma empresa
router.post("/tenants/:id/members", async (req: AuthRequest, res) => {
  const { email, full_name, password, role = "user" } = req.body;

  if (!email || !full_name || !password) {
    res.status(400).json({ error: "Campos obrigatórios: email, full_name, password" });
    return;
  }
  if (!["admin", "user"].includes(role)) {
    res.status(400).json({ error: "Role deve ser 'admin' ou 'user'" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres" });
    return;
  }

  const client = await pool.connect();
  try {
    // Verifica se empresa existe
    const { rows: co } = await client.query(`SELECT id FROM companies WHERE id = $1`, [req.params.id]);
    if (!co[0]) { res.status(404).json({ error: "Empresa não encontrada" }); return; }

    // Verifica email duplicado
    const { rows: emailCheck } = await client.query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
    if (emailCheck[0]) { res.status(409).json({ error: "E-mail já cadastrado" }); return; }

    // Cria no Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error("[developer/tenants/:id/members] Supabase error:", authError);
      res.status(500).json({ error: authError?.message || "Erro ao criar usuário" });
      return;
    }

    // Cria perfil local
    const { rows: [user] } = await client.query(
      `INSERT INTO users (supabase_user_id, company_id, full_name, email, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role, created_at`,
      [authData.user.id, req.params.id, full_name, email.toLowerCase(), role]
    );

    res.status(201).json(user);
  } catch (err: any) {
    console.error("[developer/tenants/:id/members]", err);
    if (err.code === "23505") res.status(409).json({ error: "E-mail já cadastrado" });
    else res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
});

// DELETE /api/developer/tenants/:id/members/:userId — remover membro
router.delete("/tenants/:id/members/:userId", async (req, res) => {
  try {
    // Busca o user para pegar supabase_user_id
    const { rows } = await pool.query(
      `SELECT id, supabase_user_id, role FROM users WHERE id = $1 AND company_id = $2`,
      [req.params.userId, req.params.id]
    );
    if (!rows[0]) { res.status(404).json({ error: "Membro não encontrado" }); return; }

    // Remove do Supabase Auth
    await supabaseAdmin.auth.admin.deleteUser(rows[0].supabase_user_id);

    // Remove perfil local
    await pool.query(`DELETE FROM users WHERE id = $1`, [req.params.userId]);

    res.json({ ok: true });
  } catch (err) { serverError(res, err, "tenants/:id/members DELETE"); }
});

// GET /api/developer/tenants/:id
router.get("/tenants/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.id, c.name, c.slug, c.email, c.active,
        c.storage_used_bytes, c.primary_color, c.secondary_color,
        c.display_name, c.logo_url, c.favicon_url, c.created_at,
        p.name as plan_name, p.price_monthly, p.storage_limit_bytes, p.max_users
      FROM companies c JOIN plans p ON p.id = c.plan_id
      WHERE c.id = $1
    `, [req.params.id]);

    if (!rows[0]) { res.status(404).json({ error: "Empresa não encontrada" }); return; }

    const [{ rows: members }, { rows: modules }, { rows: requests }] = await Promise.all([
      pool.query(
        `SELECT id, full_name, email, role, created_at FROM users WHERE company_id = $1 ORDER BY created_at`,
        [req.params.id]
      ),
      pool.query(`
        SELECT
          m.key as module_key,
          m.name, m.description,
          COALESCE(cm.active, false) as active
        FROM modules m
        LEFT JOIN company_modules cm ON cm.module_key = m.key AND cm.company_id = $1
        ORDER BY m.name`, [req.params.id]
      ),
      pool.query(
        `SELECT id, title, status, votes, created_at FROM feature_requests
         WHERE company_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [req.params.id]
      ),
    ]);

    res.json({ ...rows[0], members, modules, recent_requests: requests });
  } catch (err) { serverError(res, err, "tenants/:id"); }
});

// PATCH /api/developer/tenants/:id
router.patch("/tenants/:id", async (req: AuthRequest, res) => {
  try {
    const { active, plan_name, primary_color, display_name } = req.body;
    const updates: string[] = [];
    const values: unknown[]  = [];
    let i = 1;

    if (typeof active === "boolean") {
      updates.push(`active = $${i++}`);
      values.push(active);
    }
    if (typeof primary_color === "string" && /^#[0-9a-fA-F]{6}$/.test(primary_color)) {
      updates.push(`primary_color = $${i++}`);
      values.push(primary_color);
    }
    if (typeof display_name === "string") {
      updates.push(`display_name = $${i++}`);
      values.push(display_name.slice(0, 100));
    }
    if (plan_name) {
      const { rows: p } = await pool.query(`SELECT id FROM plans WHERE name = $1`, [plan_name]);
      if (p[0]) { updates.push(`plan_id = $${i++}`); values.push(p[0].id); }
    }

    if (updates.length === 0) { res.status(400).json({ error: "Nada para atualizar" }); return; }
    values.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE companies SET ${updates.join(", ")} WHERE id = $${i}
       RETURNING id, name, slug, email, active, storage_used_bytes,
                 primary_color, secondary_color, display_name, logo_url, created_at`,
      values
    );
    if (!rows[0]) { res.status(404).json({ error: "Empresa não encontrada" }); return; }
    res.json(rows[0]);
  } catch (err) { serverError(res, err, "tenants/:id PATCH"); }
});

// PATCH /api/developer/tenants/:id/modules/:key — toggle módulo
router.patch("/tenants/:id/modules/:key", async (req, res) => {
  try {
    const { id, key } = req.params;
    // Verifica se empresa existe
    const { rows: co } = await pool.query(`SELECT id FROM companies WHERE id = $1`, [id]);
    if (!co[0]) { res.status(404).json({ error: "Empresa não encontrada" }); return; }

    // Verifica se módulo existe
    const { rows: mod } = await pool.query(`SELECT key FROM modules WHERE key = $1`, [key]);
    if (!mod[0]) { res.status(404).json({ error: "Módulo não encontrado" }); return; }

    const { rows: existing } = await pool.query(
      `SELECT id, active FROM company_modules WHERE company_id = $1 AND module_key = $2`,
      [id, key]
    );

    if (existing[0]) {
      const { rows } = await pool.query(
        `UPDATE company_modules SET active = NOT active WHERE id = $1 RETURNING module_key, active`,
        [existing[0].id]
      );
      res.json(rows[0]);
    } else {
      const { rows } = await pool.query(
        `INSERT INTO company_modules (company_id, module_key, active) VALUES ($1, $2, true) RETURNING module_key, active`,
        [id, key]
      );
      res.json(rows[0]);
    }
  } catch (err) { serverError(res, err, "tenants/:id/modules/:key"); }
});

// GET /api/developer/feature-requests
router.get("/feature-requests", async (req, res) => {
  try {
    const ALLOWED = ["pending","reviewing","planned","in_progress","done","rejected"];
    const { status } = req.query;
    const where  = status && ALLOWED.includes(status as string) ? `WHERE fr.status = $1` : "";
    const params = where ? [status] : [];
    const { rows } = await pool.query(`
      SELECT fr.id, fr.title, fr.status, fr.votes, fr.created_at,
             c.name as tenant_name, c.slug as tenant_slug
      FROM feature_requests fr JOIN companies c ON c.id = fr.company_id
      ${where} ORDER BY fr.votes DESC, fr.created_at DESC
    `, params);
    res.json(rows);
  } catch (err) { serverError(res, err, "feature-requests"); }
});

// PATCH /api/developer/feature-requests/:id
router.patch("/feature-requests/:id", async (req, res) => {
  try {
    const ALLOWED = ["pending","reviewing","planned","in_progress","done","rejected"];
    const { status } = req.body;
    if (!ALLOWED.includes(status)) { res.status(400).json({ error: "Status inválido" }); return; }
    const { rows } = await pool.query(
      `UPDATE feature_requests SET status = $1 WHERE id = $2 RETURNING id, title, status, votes`,
      [status, req.params.id]
    );
    if (!rows[0]) { res.status(404).json({ error: "Sugestão não encontrada" }); return; }
    res.json(rows[0]);
  } catch (err) { serverError(res, err, "feature-requests PATCH"); }
});

// GET /api/developer/plans
router.get("/plans", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, storage_limit_bytes, max_users, price_monthly FROM plans ORDER BY price_monthly`
    );
    res.json(rows);
  } catch (err) { serverError(res, err, "plans"); }
});

export default router;
