import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "hubsolutions_jwt_secret_local";

export interface AuthRequest extends Request {
  user?: { id: string; company_id: string; role: string; email: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AuthRequest["user"];
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

export function signToken(payload: AuthRequest["user"]) {
  return jwt.sign(payload!, JWT_SECRET, { expiresIn: "7d" });
}
