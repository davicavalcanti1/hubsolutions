import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";

// SUPABASE_JWT_SECRET: encontre em Supabase Dashboard → Settings → API → JWT Secret
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
if (!SUPABASE_JWT_SECRET) {
  console.error("[FATAL] SUPABASE_JWT_SECRET não definido.");
  process.exit(1);
}

export interface AuthUser {
  id: string;             // UUID do perfil local (users.id)
  supabase_id: string;    // UUID do Supabase auth.users
  company_id: string | null;
  role: string;
  email: string;
  full_name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

interface SupabaseJWTPayload {
  sub: string;    // supabase user UUID
  email: string;
  role: string;   // 'authenticated' — NÃO é o role da plataforma
  exp: number;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const token = header.slice(7);
  let supabaseId: string;

  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET!) as SupabaseJWTPayload;
    supabaseId = payload.sub;
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.supabase_user_id, u.company_id, u.role, u.full_name, u.email
       FROM users u WHERE u.supabase_user_id = $1`,
      [supabaseId]
    );

    if (!rows[0]) {
      // Usuário autenticado no Supabase mas sem perfil local ainda
      res.status(403).json({ error: "Perfil não configurado", code: "NO_PROFILE" });
      return;
    }

    req.user = { ...rows[0], supabase_id: supabaseId };
    next();
  } catch (err) {
    console.error("[requireAuth] DB error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
}

export function requireSuperadmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "superadmin") {
    res.status(403).json({ error: "Acesso restrito ao developer" });
    return;
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!["superadmin", "admin"].includes(req.user?.role ?? "")) {
    res.status(403).json({ error: "Requer permissão de administrador" });
    return;
  }
  next();
}

/** Impede que superadmin (company_id null) acesse rotas de empresa */
export function requireCompany(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.company_id) {
    res.status(403).json({ error: "Rota restrita a usuários de empresa" });
    return;
  }
  next();
}
