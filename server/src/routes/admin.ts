/**
 * Admin routes — gerenciamento de tenants, planos e uso
 * Requer role = 'admin' no tenant_users
 */
import { Router } from "express";
import { pool as hubPool } from "../db/pool.js";
import { requireTenant, type TenantRequest } from "../middleware/tenantContext.js";
import { getUsageSummary, getUsageHistory } from "../middleware/usageTracker.js";
import { invalidateCache } from "../db/tenantRouter.js";

const router = Router();
router.use(requireTenant);

function requireAdmin(req: TenantRequest, res: any, next: any) {
  if (req.tenantUser?.role !== "admin") {
    res.status(403).json({ error: "Requer role admin" });
    return;
  }
  next();
}

// GET /api/admin/usage — resumo de uso do tenant atual
router.get("/usage", async (req: TenantRequest, res) => {
  const summary = await getUsageSummary(req.tenant!.id);
  res.json(summary);
});

// GET /api/admin/usage/history?days=30
router.get("/usage/history", requireAdmin, async (req: TenantRequest, res) => {
  const days = Number(req.query.days) || 30;
  const history = await getUsageHistory(req.tenant!.id, days);
  res.json(history);
});

// GET /api/admin/plans — planos disponíveis para upgrade
router.get("/plans", async (_req, res) => {
  const { rows } = await hubPool.query(
    `SELECT id, name, storage_limit_bytes, max_users, price_monthly FROM plans ORDER BY price_monthly`
  );
  res.json(rows);
});

// POST /api/admin/plan/upgrade — troca de plano (sem pagamento por agora)
router.post("/plan/upgrade", requireAdmin, async (req: TenantRequest, res) => {
  const { plan_name } = req.body;
  const { rows: plans } = await hubPool.query(`SELECT id FROM plans WHERE name = $1`, [plan_name]);
  if (!plans[0]) { res.status(404).json({ error: "Plano não encontrado" }); return; }
  await hubPool.query(`UPDATE tenants SET plan_id = $1 WHERE id = $2`, [plans[0].id, req.tenant!.id]);
  invalidateCache(req.tenant!.id);
  res.json({ ok: true, plan: plan_name });
});

// GET /api/admin/members — membros do tenant
router.get("/members", requireAdmin, async (req: TenantRequest, res) => {
  const { rows } = await hubPool.query(
    `SELECT id, full_name, email, role, created_at FROM tenant_users WHERE tenant_id = $1 ORDER BY created_at`,
    [req.tenant!.id]
  );
  res.json(rows);
});

// DELETE /api/admin/members/:id — remove membro
router.delete("/members/:id", requireAdmin, async (req: TenantRequest, res) => {
  if (req.params.id === req.tenantUser!.supabase_user_id) {
    res.status(400).json({ error: "Não pode remover a si mesmo" });
    return;
  }
  await hubPool.query(
    `DELETE FROM tenant_users WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, req.tenant!.id]
  );
  res.json({ ok: true });
});

export default router;
