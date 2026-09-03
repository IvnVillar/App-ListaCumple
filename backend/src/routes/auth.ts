import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db";
import { hashPassword, verifyPassword } from "../auth/password";
import { signToken } from "../auth/jwt";
import { requireAuth } from "../auth/middleware";
import { usernameSchema } from "../domain/username";
import { isUniqueViolation } from "../db/pgErrors";
import { writeActionLimiter } from "../rateLimit";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  // bcrypt trunca en 72 bytes: sin este máximo, alguien podría escribir una
  // contraseña arbitrariamente larga creyendo que aporta seguridad extra
  // más allá de ese límite (y una entrada gigante no cuesta nada rechazarla).
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña no puede tener más de 72 caracteres"),
});

const registerSchema = credentialsSchema.extend({ username: usernameSchema });

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
}

export function createAuthRouter(db: Db): Router {
  const router = Router();

  router.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, username, password } = parsed.data;

    const existing = await db.query<{ email: string; username: string }>(
      "SELECT email, username FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );
    const conflict = existing.rows[0];
    if (conflict) {
      const emailTaken = conflict.email === email;
      return res
        .status(409)
        .json({ error: emailTaken ? "Ya existe una cuenta con ese email" : "Ese nombre de usuario ya está en uso" });
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    try {
      await db.query("INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)", [
        id,
        email,
        username,
        passwordHash,
      ]);
    } catch (err) {
      // La comprobación SELECT de arriba no es atómica: dos registros con el
      // mismo email o usuario a la vez pueden pasarla ambos y chocar aquí
      // contra el UNIQUE de la columna — sin este catch, el segundo devolvía un 500.
      if (isUniqueViolation(err)) {
        const constraint = (err as { constraint?: string }).constraint ?? "";
        const emailTaken = constraint.includes("email");
        return res
          .status(409)
          .json({ error: emailTaken ? "Ya existe una cuenta con ese email" : "Ese nombre de usuario ya está en uso" });
      }
      throw err;
    }

    const token = signToken({ userId: id });
    return res.status(201).json({ token, username });
  });

  router.post("/login", async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, password } = parsed.data;

    const result = await db.query<UserRow>("SELECT id, username, password_hash FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const token = signToken({ userId: user.id });
    return res.json({ token, username: user.username });
  });

  // Las cuentas ya existentes cuando se añadió el username (spec de
  // amigos) se quedaron con uno autogenerado ilegible (p. ej.
  // "user_dddd7064") — sin esto no había forma de ponerse uno presentable.
  router.patch("/username", requireAuth, writeActionLimiter, async (req, res) => {
    const parsed = z.object({ username: usernameSchema }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    try {
      const result = await db.query<{ username: string }>(
        "UPDATE users SET username = $1 WHERE id = $2 RETURNING username",
        [parsed.data.username, req.userId!]
      );
      return res.json({ username: result.rows[0].username });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return res.status(409).json({ error: "Ese nombre de usuario ya está en uso" });
      }
      throw err;
    }
  });

  return router;
}
