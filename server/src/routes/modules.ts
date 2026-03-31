import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/modules — todos os módulos disponíveis
router.get("/", async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM modules ORDER BY name`);
  res.json(rows);
});

export default router;
