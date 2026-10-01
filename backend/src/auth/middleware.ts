import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Db } from "../db";
import { verifyToken } from "./jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Fábrica en vez de función suelta porque, desde que existe el reset de
 * contraseña, validar un token ya no es puramente criptográfico: hay que
 * comprobar contra la base de datos que su `tokenVersion` sigue siendo la
 * vigente para ese usuario (si no, es un token de antes de un cambio de
 * contraseña, y debe dejar de servir — checklist: "reset sessions on
 * password change").
 */
export function createRequireAuth(db: Db): RequestHandler {
  return async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

    if (!token) {
      return res.status(401).json({ error: "Falta el token de autenticación" });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Token inválido o caducado" });
    }

    // payload.tokenVersion ausente = token emitido antes de esta comprobación:
    // se deja pasar por compatibilidad en vez de desconectar a todo el mundo
    // de golpe al desplegar esto.
    if (payload.tokenVersion !== undefined) {
      const result = await db.query<{ token_version: number }>("SELECT token_version FROM users WHERE id = $1", [
        payload.userId,
      ]);
      const user = result.rows[0];
      if (!user || user.token_version !== payload.tokenVersion) {
        return res.status(401).json({ error: "Token inválido o caducado" });
      }
    }

    req.userId = payload.userId;
    next();
  };
}
