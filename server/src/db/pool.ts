import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("[FATAL] DATABASE_URL não definida.");
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // necessário para Supabase
  max: 10,
  idleTimeoutMillis: 30000,
});
