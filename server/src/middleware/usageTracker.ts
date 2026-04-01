import { pool } from "../db/pool.js";

export type EventType = "insert" | "update" | "delete" | "storage_add" | "storage_remove";

export async function trackUsage(
  tenantId: string,
  eventType: EventType,
  tableName: string,
  sizeBytes = 0
) {
  try {
    await pool.query(
      `INSERT INTO usage_events (company_id, event_type, table_name, size_bytes) VALUES ($1, $2, $3, $4)`,
      [tenantId, eventType, tableName, sizeBytes]
    );
    if (sizeBytes !== 0) {
      const delta = eventType === "storage_remove" || eventType === "delete" ? -sizeBytes : sizeBytes;
      await pool.query(
        `UPDATE companies SET storage_used_bytes = GREATEST(0, storage_used_bytes + $1) WHERE id = $2`,
        [delta, tenantId]
      );
    }
  } catch (err) {
    console.error("[usageTracker]", err);
  }
}

export async function getUsageSummary(companyId: string) {
  const { rows } = await pool.query(`
    SELECT
      c.id,
      (SELECT count(*) FROM users WHERE company_id = c.id) as user_count,
      (SELECT count(*) FROM company_modules WHERE company_id = c.id AND active) as active_modules
    FROM companies c WHERE c.id = $1
  `, [companyId]);
  return rows[0] || null;
}

export async function getUsageHistory(companyId: string, days = 30) {
  const { rows } = await pool.query(`
    SELECT
      date_trunc('day', created_at) as day,
      count(*) as events
    FROM users
    WHERE company_id = $1 AND created_at > now() - ($2 || ' days')::interval
    GROUP BY 1 ORDER BY 1 DESC
  `, [companyId, days]);
  return rows;
}
