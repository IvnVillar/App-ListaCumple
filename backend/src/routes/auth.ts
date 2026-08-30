import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "../db";
import { hashPassword, verifyPassword } from "../auth/password";
import { signToken } from "../auth/jwt";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

interface UserRow {
  id: string;
  password_hash: string;
}

export function createAuthRouter(db: Db): Router {
  const router = Router();

  router.post("/register", async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, password } = parsed.data;

    const existing = await db.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    await db.query("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", [
      id,
      email,
      passwordHash,
    ]);

    const token = signToken({ userId: id });
    return res.status(201).json({ token });
  });

  router.post("/login", async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, password } = parsed.data;

    const result = await db.query<UserRow>("SELECT id, password_hash FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const token = signToken({ userId: user.id });
    return res.json({ token });
  });

  return router;
}
