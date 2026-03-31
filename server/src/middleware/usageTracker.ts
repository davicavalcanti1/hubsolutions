/**
 * Usage Tracker
 * 
 * Registra eventos de uso (insert/update/delete) e atualiza
 * storage_used_bytes do tenant de forma assíncrona.
 */
import { pool as hubPool } from "../db/pool.js";
import { invalidateCache } from "../db/tenantRouter.js";

export type EventType = "insert" | "update" | "delete" | "storage_add" | "storage_remove";

export async function trackUsage(
  tenantId: string,
  eventType: EventType,
  tableName: string,
  sizeBytes = 0
) {
  try {
    await hubPool.query(
      `INSERT INTO usage_events (tenant_id, event_type, table_name, size_bytes) VALUES ($1, $2, $3, $4)`,
      [tenantId, eventType, tableName, sizeBytes]
    );

    if (sizeBytes !== 0) {
      const delta = eventType === "storage_remove" || eventType === "delete" ? -sizeBytes : sizeBytes;
      await hubPool.query(
        `UPDATE tenants SET storage_used_bytes = GREATEST(0, storage_used_bytes + $1) WHERE id = $2`,
        [delta, tenantId]
      );
      invalidateCache(tenantId); // força reload da config com novo valor
    }
  } catch (err) {
    console.error("[usageTracker] erro:", err);
  }
}

export async function getUsageSummary(tenantId: string) {
  const { rows } = await hubPool.query(`
    SELECT
      t.storage_used_bytes,
      p.storage_limit_bytes,
      p.name as plan_name,
      p.price_monthly,
      round(t.storage_used_bytes::numeric / NULLIF(p.storage_limit_bytes, 0) * 100, 2) as usage_pct,
      (SELECT count(*) FROM tenant_users WHERE tenant_id = t.id) as user_count,
      p.max_users
    FROM tenants t JOIN plans p ON p.id = t.plan_id
    WHERE t.id = $1
  `, [tenantId]);
  return rows[0] || null;
}

export async function getUsageHistory(tenantId: string, days = 30) {
  const { rows } = await hubPool.query(`
    SELECT
      date_trunc('day', created_at) as day,
      event_type,
      count(*) as events,
      sum(size_bytes) as total_bytes
    FROM usage_events
    WHERE tenant_id = $1 AND created_at > now() - ($2 || ' days')::interval
    GROUP BY 1, 2
    ORDER BY 1 DESC
  `, [tenantId, days]);
  return rows;
}
