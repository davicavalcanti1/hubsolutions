/**
 * Admin routes — gerenciamento de tenants, planos e uso
 * Requer role = 'admin' (via requireAuth + requireAdmin)
 */
import { Router } from "express";
import { pool as hubPool } from "../db/pool.js";
import { requireAuth, requireAdmin as requireAdminAuth, requireCompany, type AuthRequest } from "../middleware/auth.js";
import { getUsageSummary, getUsageHistory } from "../middleware/usageTracker.js";
import { invalidateCache } from "../db/tenantRouter.js";

const router = Router();
router.use(requireAuth);
router.use(requireCompany);  // superadmin não usa esta rota

function requireAdmin(req: AuthRequest, res: any, next: any) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Requer role admin" });
    return;
  }
  next();
}

// GET /api/admin/usage — resumo de uso do tenant atual
router.get("/usage", async (req: AuthRequest, res) => {
  try {
    const summary = await getUsageSummary(req.user!.company_id!);
    res.json(summary);
  } catch (err) {
    console.error("[admin/usage]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/admin/usage/history?days=30
router.get("/usage/history", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const history = await getUsageHistory(req.user!.company_id!, days);
    res.json(history);
  } catch (err) {
    console.error("[admin/usage/history]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/admin/plans — planos disponíveis para upgrade
router.get("/plans", async (_req, res) => {
  try {
    const { rows } = await hubPool.query(
      `SELECT id, name, storage_limit_bytes, max_users, price_monthly FROM plans ORDER BY price_monthly`
    );
    res.json(rows);
  } catch (err) {
    console.error("[admin/plans]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/admin/plan/upgrade — troca de plano (sem pagamento por agora)
router.post("/plan/upgrade", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { plan_name } = req.body;
    const { rows: plans } = await hubPool.query(`SELECT id FROM plans WHERE name = $1`, [plan_name]);
    if (!plans[0]) { res.status(404).json({ error: "Plano não encontrado" }); return; }
    await hubPool.query(`UPDATE tenants SET plan_id = $1 WHERE id = $2`, [plans[0].id, req.user!.company_id]);
    invalidateCache(req.user!.company_id!);
    res.json({ ok: true, plan: plan_name });
  } catch (err) {
    console.error("[admin/plan/upgrade]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/admin/members — membros do tenant
router.get("/members", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { rows } = await hubPool.query(
      `SELECT id, full_name, email, role, created_at FROM users WHERE company_id = $1 ORDER BY created_at`,
      [req.user!.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("[admin/members]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/admin/members/:id — remove membro
router.delete("/members/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Protege contra auto-remoção comparando o ID correto (pk da tabela users)
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: "Não pode remover a si mesmo" }); return;
    }
    const result = await hubPool.query(
      `DELETE FROM users WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user!.company_id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Membro não encontrado" }); return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/members/delete]", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
