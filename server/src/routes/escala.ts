import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireCompany } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireCompany);

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAIS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/locais", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM locais WHERE company_id = $1 ORDER BY nome",
      [req.user!.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /escala/locais:", err);
    res.status(500).json({ error: "Erro ao listar locais" });
  }
});

router.post("/locais", async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: "Nome é obrigatório" });

    const { rows } = await pool.query(
      "INSERT INTO locais (company_id, nome, descricao) VALUES ($1, $2, $3) RETURNING *",
      [req.user!.company_id, nome.trim(), descricao?.trim() ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /escala/locais:", err);
    res.status(500).json({ error: "Erro ao criar local" });
  }
});

router.patch("/locais/:id", async (req, res) => {
  try {
    const { nome, descricao, ativo } = req.body;
    const { rows } = await pool.query(
      `UPDATE locais SET
         nome      = COALESCE($1, nome),
         descricao = COALESCE($2, descricao),
         ativo     = COALESCE($3, ativo)
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [nome?.trim() ?? null, descricao?.trim() ?? null, ativo ?? null, req.params.id, req.user!.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Local não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /escala/locais/:id:", err);
    res.status(500).json({ error: "Erro ao atualizar local" });
  }
});

router.delete("/locais/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM locais WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user!.company_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /escala/locais/:id:", err);
    res.status(500).json({ error: "Erro ao excluir local" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONÁRIOS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/funcionarios", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM funcionarios WHERE company_id = $1 ORDER BY nome",
      [req.user!.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /escala/funcionarios:", err);
    res.status(500).json({ error: "Erro ao listar funcionários" });
  }
});

router.post("/funcionarios", async (req, res) => {
  try {
    const { nome, cargo, setor, email, telefone } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: "Nome é obrigatório" });

    const { rows } = await pool.query(
      `INSERT INTO funcionarios (company_id, nome, cargo, setor, email, telefone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user!.company_id, nome.trim(), cargo?.trim() ?? null, setor?.trim() ?? null, email?.trim() ?? null, telefone?.trim() ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /escala/funcionarios:", err);
    res.status(500).json({ error: "Erro ao criar funcionário" });
  }
});

router.patch("/funcionarios/:id", async (req, res) => {
  try {
    const { nome, cargo, setor, email, telefone, ativo } = req.body;
    const { rows } = await pool.query(
      `UPDATE funcionarios SET
         nome     = COALESCE($1, nome),
         cargo    = COALESCE($2, cargo),
         setor    = COALESCE($3, setor),
         email    = COALESCE($4, email),
         telefone = COALESCE($5, telefone),
         ativo    = COALESCE($6, ativo)
       WHERE id = $7 AND company_id = $8
       RETURNING *`,
      [nome?.trim() ?? null, cargo?.trim() ?? null, setor?.trim() ?? null, email?.trim() ?? null, telefone?.trim() ?? null, ativo ?? null, req.params.id, req.user!.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Funcionário não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /escala/funcionarios/:id:", err);
    res.status(500).json({ error: "Erro ao atualizar funcionário" });
  }
});

router.delete("/funcionarios/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM funcionarios WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user!.company_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /escala/funcionarios/:id:", err);
    res.status(500).json({ error: "Erro ao excluir funcionário" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÉDICOS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/medicos", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM medicos WHERE company_id = $1 ORDER BY nome",
      [req.user!.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /escala/medicos:", err);
    res.status(500).json({ error: "Erro ao listar médicos" });
  }
});

router.post("/medicos", async (req, res) => {
  try {
    const { nome, crm, especialidade, email, telefone } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: "Nome é obrigatório" });

    const { rows } = await pool.query(
      `INSERT INTO medicos (company_id, nome, crm, especialidade, email, telefone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user!.company_id, nome.trim(), crm?.trim() ?? null, especialidade?.trim() ?? null, email?.trim() ?? null, telefone?.trim() ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /escala/medicos:", err);
    res.status(500).json({ error: "Erro ao criar médico" });
  }
});

router.patch("/medicos/:id", async (req, res) => {
  try {
    const { nome, crm, especialidade, email, telefone, ativo } = req.body;
    const { rows } = await pool.query(
      `UPDATE medicos SET
         nome         = COALESCE($1, nome),
         crm          = COALESCE($2, crm),
         especialidade= COALESCE($3, especialidade),
         email        = COALESCE($4, email),
         telefone     = COALESCE($5, telefone),
         ativo        = COALESCE($6, ativo)
       WHERE id = $7 AND company_id = $8
       RETURNING *`,
      [nome?.trim() ?? null, crm?.trim() ?? null, especialidade?.trim() ?? null, email?.trim() ?? null, telefone?.trim() ?? null, ativo ?? null, req.params.id, req.user!.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Médico não encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /escala/medicos/:id:", err);
    res.status(500).json({ error: "Erro ao atualizar médico" });
  }
});

router.delete("/medicos/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM medicos WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user!.company_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /escala/medicos/:id:", err);
    res.status(500).json({ error: "Erro ao excluir médico" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCALAS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/", async (req, res) => {
  try {
    const { mes, ano } = req.query as Record<string, string>;
    let sql = "SELECT e.*, l.nome as local_nome FROM escalas e LEFT JOIN locais l ON l.id = e.local_id WHERE e.company_id = $1";
    const params: unknown[] = [req.user!.company_id];
    let idx = 2;

    if (mes) { sql += ` AND e.mes = $${idx++}`; params.push(Number(mes)); }
    if (ano) { sql += ` AND e.ano = $${idx++}`; params.push(Number(ano)); }

    sql += " ORDER BY e.ano DESC, e.mes DESC, e.nome";
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /escala:", err);
    res.status(500).json({ error: "Erro ao listar escalas" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nome, mes, ano, local_id, dados } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: "Nome é obrigatório" });
    if (!mes || !ano)  return res.status(400).json({ error: "Mês e ano são obrigatórios" });

    const { rows } = await pool.query(
      `INSERT INTO escalas (company_id, nome, mes, ano, local_id, dados)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user!.company_id, nome.trim(), Number(mes), Number(ano), local_id ?? null, JSON.stringify(dados ?? {})]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /escala:", err);
    res.status(500).json({ error: "Erro ao criar escala" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM escalas WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user!.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Escala não encontrada" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /escala/:id:", err);
    res.status(500).json({ error: "Erro ao buscar escala" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { nome, dados } = req.body;
    const { rows } = await pool.query(
      `UPDATE escalas SET
         nome         = COALESCE($1, nome),
         dados        = CASE WHEN $2 IS NOT NULL THEN $2 ELSE dados END,
         atualizado_em = now()
       WHERE id = $3 AND company_id = $4
       RETURNING *`,
      [nome?.trim() ?? null, dados ? JSON.stringify(dados) : null, req.params.id, req.user!.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Escala não encontrada" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /escala/:id:", err);
    res.status(500).json({ error: "Erro ao atualizar escala" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM escalas WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user!.company_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /escala/:id:", err);
    res.status(500).json({ error: "Erro ao excluir escala" });
  }
});

export default router;
