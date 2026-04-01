import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireCompany } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireCompany);

// ── Helpers ──────────────────────────────────────────────────────────────────

function genProtocolo(tipo: string): string {
  const prefix = tipo.substring(0, 3).toUpperCase();
  const now    = new Date();
  const yy     = String(now.getFullYear()).slice(2);
  const mm     = String(now.getMonth() + 1).padStart(2, "0");
  const rand   = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${yy}${mm}-${rand}`;
}

// ── List occurrences ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { tipo, status, limit = "100", offset = "0" } = req.query as Record<string, string>;
    const company_id = req.user!.company_id;

    let sql  = "SELECT * FROM occurrences WHERE company_id = $1";
    const params: unknown[] = [company_id];
    let idx = 2;

    if (tipo) {
      sql += ` AND tipo = $${idx++}`;
      params.push(tipo);
    }
    if (status) {
      sql += ` AND status = $${idx++}`;
      params.push(status);
    }

    sql += ` ORDER BY criado_em DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Number(limit), Number(offset));

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /ocorrencias:", err);
    res.status(500).json({ error: "Erro ao listar ocorrências" });
  }
});

// ── Get single occurrence ─────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM occurrences WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user!.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Ocorrência não encontrada" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /ocorrencias/:id:", err);
    res.status(500).json({ error: "Erro ao buscar ocorrência" });
  }
});

// ── Create occurrence ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { tipo, subtipo, dados } = req.body;

    if (!tipo) return res.status(400).json({ error: "Campo 'tipo' é obrigatório" });

    const VALID_TIPOS = ["administrativa", "revisao_exame", "enfermagem", "paciente", "livre", "seguranca_paciente"];
    if (!VALID_TIPOS.includes(tipo)) return res.status(400).json({ error: "Tipo inválido" });

    const protocolo = genProtocolo(tipo);
    const company_id = req.user!.company_id;
    const criado_por = req.user!.id;

    const { rows } = await pool.query(
      `INSERT INTO occurrences
         (company_id, protocolo, tipo, subtipo, status, dados, historico_status, criado_por)
       VALUES ($1, $2, $3, $4, 'registrada', $5, '[]', $6)
       RETURNING *`,
      [company_id, protocolo, tipo, subtipo ?? null, JSON.stringify(dados ?? {}), criado_por]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /ocorrencias:", err);
    res.status(500).json({ error: "Erro ao criar ocorrência" });
  }
});

// ── Update occurrence (status, triagem, desfecho, dados) ─────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const { rows: existing } = await pool.query(
      "SELECT * FROM occurrences WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user!.company_id]
    );
    if (!existing[0]) return res.status(404).json({ error: "Ocorrência não encontrada" });
    const occ = existing[0];

    const { status, triagem, desfecho, dados, motivo } = req.body;

    // Validate status transition
    const VALID_TRANSITIONS: Record<string, string[]> = {
      registrada:        ["em_triagem", "improcedente"],
      em_triagem:        ["em_analise", "improcedente"],
      em_analise:        ["acao_em_andamento", "concluida", "improcedente"],
      acao_em_andamento: ["concluida", "improcedente"],
      concluida:         [],
      improcedente:      [],
    };

    let newHistorico = occ.historico_status ?? [];

    if (status && status !== occ.status) {
      const allowed = VALID_TRANSITIONS[occ.status] ?? [];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `Transição inválida: ${occ.status} → ${status}` });
      }
      newHistorico = [...newHistorico, {
        de: occ.status, para: status,
        por: req.user!.full_name ?? req.user!.id,
        em: new Date().toISOString(),
        motivo: motivo ?? null,
      }];
    }

    const { rows } = await pool.query(
      `UPDATE occurrences SET
         status           = COALESCE($1, status),
         triagem          = COALESCE($2, triagem),
         triagem_por      = CASE WHEN $2 IS NOT NULL THEN $3 ELSE triagem_por END,
         triagem_em       = CASE WHEN $2 IS NOT NULL THEN now() ELSE triagem_em END,
         desfecho         = COALESCE($4, desfecho),
         dados            = CASE WHEN $5 IS NOT NULL THEN $5 ELSE dados END,
         historico_status = $6,
         atualizado_em    = now()
       WHERE id = $7 AND company_id = $8
       RETURNING *`,
      [
        status ?? null,
        triagem ?? null,
        req.user!.full_name ?? req.user!.id,
        desfecho ? JSON.stringify(desfecho) : null,
        dados ? JSON.stringify(dados) : null,
        JSON.stringify(newHistorico),
        req.params.id,
        req.user!.company_id,
      ]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /ocorrencias/:id:", err);
    res.status(500).json({ error: "Erro ao atualizar ocorrência" });
  }
});

// ── Delete occurrence (admin only) ────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    if (req.user!.role !== "admin" && req.user!.role !== "superadmin") {
      return res.status(403).json({ error: "Apenas administradores podem excluir ocorrências" });
    }
    await pool.query(
      "DELETE FROM occurrences WHERE id = $1 AND company_id = $2",
      [req.params.id, req.user!.company_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /ocorrencias/:id:", err);
    res.status(500).json({ error: "Erro ao excluir ocorrência" });
  }
});

export default router;
