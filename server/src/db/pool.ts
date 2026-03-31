import { Pool } from "pg";

export const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || "hubsolutions",
  user:     process.env.DB_USER     || "hubsolutions_user",
  password: process.env.DB_PASSWORD || "hubsolutions_dev",
});
