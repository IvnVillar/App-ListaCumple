import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    return res.status(401).json({ error: "Falta el token de autenticación" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Token inválido o caducado" });
  }

  req.userId = payload.userId;
  next();
}
