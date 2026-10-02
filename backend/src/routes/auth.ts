import { randomUUID } from "node:crypto";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Db } from "../db";
import { hashPassword, verifyPassword } from "../auth/password";
import { signToken } from "../auth/jwt";
import { createRequireAuth } from "../auth/middleware";
import { usernameSchema } from "../domain/username";
import { isUniqueViolation } from "../db/pgErrors";
import { logSecurityEvent } from "../security/log";
import type { Mailer } from "../mail/mailer";
import { resendMailer } from "../mail/resendMailer";
import { InvalidResetTokenError, requestPasswordReset, resetPassword } from "../services/passwordReset";

// Complementa el rate limit por IP (que no frena a quien reparte sus
// intentos entre varias IPs contra UNA cuenta concreta): tras demasiados
// fallos seguidos, esa cuenta se bloquea un rato aunque la contraseña
// probada a continuación sea la correcta.
const MAX_FAILED_ATTEMPTS = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000;

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

const registerSchema = credentialsSchema.extend({
  username: usernameSchema,
  // El cliente solo deja marcar estas casillas si están a true (checklist
  // legal: aceptación de Términos/Privacidad + edad mínima), pero se vuelve
  // a exigir aquí por si alguien llama a la API directamente sin pasar por
  // la pantalla de registro.
  accepted_terms: z.literal(true, { message: "Debes aceptar los Términos y la Política de Privacidad" }),
  confirmed_age: z.literal(true, { message: "Debes confirmar que tienes la edad mínima requerida" }),
});

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  failed_login_attempts: number;
  locked_until: string | null;
  token_version: number;
}

export function createAuthRouter(
  db: Db,
  writeActionLimiter: RequestHandler,
  passwordResetLimiter: RequestHandler,
  mailer: Mailer = resendMailer
): Router {
  const router = Router();
  const requireAuth = createRequireAuth(db);

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
      await db.query(
        "INSERT INTO users (id, email, username, password_hash, terms_accepted_at) VALUES ($1, $2, $3, $4, now())",
        [id, email, username, passwordHash]
      );
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

    const token = signToken({ userId: id, tokenVersion: 0 });
    logSecurityEvent("register", { userId: id });
    return res.status(201).json({ token, username });
  });

  router.post("/login", async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, password } = parsed.data;

    const result = await db.query<UserRow>(
      "SELECT id, username, password_hash, failed_login_attempts, locked_until, token_version FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (user?.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      logSecurityEvent("login_failed", { userId: user.id, reason: "locked" });
      return res.status(423).json({
        error: "Cuenta bloqueada temporalmente por demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.",
      });
    }

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      if (user) {
        const attempts = user.failed_login_attempts + 1;
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          await db.query(
            "UPDATE users SET failed_login_attempts = 0, locked_until = now() + ($2 * interval '1 millisecond') WHERE id = $1",
            [user.id, LOCK_DURATION_MS]
          );
          logSecurityEvent("account_locked", { userId: user.id });
        } else {
          await db.query("UPDATE users SET failed_login_attempts = $2 WHERE id = $1", [user.id, attempts]);
        }
        logSecurityEvent("login_failed", { userId: user.id, reason: "wrong_password" });
      } else {
        logSecurityEvent("login_failed", { reason: "unknown_email" });
      }
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    if (user.failed_login_attempts > 0) {
      await db.query("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1", [user.id]);
    }

    const token = signToken({ userId: user.id, tokenVersion: user.token_version });
    logSecurityEvent("login_success", { userId: user.id });
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

  // Ajustes lee aquí si el aviso de nuevas versiones está activado, ya que
  // ni el login ni el registro devuelven esa preferencia.
  router.get("/me", requireAuth, async (req, res) => {
    const result = await db.query<{
      email: string;
      username: string;
      release_notifications_enabled: boolean;
    }>("SELECT email, username, release_notifications_enabled FROM users WHERE id = $1", [req.userId!]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    return res.json(user);
  });

  router.patch("/notification-preferences", requireAuth, writeActionLimiter, async (req, res) => {
    const parsed = z.object({ release_notifications_enabled: z.boolean() }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    await db.query("UPDATE users SET release_notifications_enabled = $2 WHERE id = $1", [
      req.userId!,
      parsed.data.release_notifications_enabled,
    ]);
    return res.json({ release_notifications_enabled: parsed.data.release_notifications_enabled });
  });

  // Derecho de supresión (checklist legal): borra la cuenta y, por los
  // ON DELETE CASCADE del esquema, todo lo que depende de ella (listas,
  // artículos, reservas/aportaciones sobre esos artículos, amistades). Los
  // alias de reserva/aportación que ESTE usuario dejó en listas de otros no
  // están ligados a su cuenta (son solo texto libre), así que no se tocan.
  router.delete("/account", requireAuth, writeActionLimiter, async (req, res) => {
    await db.query("DELETE FROM users WHERE id = $1", [req.userId!]);
    logSecurityEvent("account_deleted", { userId: req.userId! });
    return res.status(204).send();
  });

  const GENERIC_RESET_MESSAGE = "Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer la contraseña.";

  router.post("/forgot-password", passwordResetLimiter, async (req, res) => {
    const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    await requestPasswordReset(db, mailer, parsed.data.email);
    logSecurityEvent("password_reset_requested", { email: parsed.data.email });
    // Mismo mensaje exista o no la cuenta (checklist: "prevent user
    // enumeration") — nunca reveles aquí si el email está registrado.
    return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
  });

  router.post("/reset-password", passwordResetLimiter, async (req, res) => {
    const parsed = z
      .object({ token: z.string().min(1), password: credentialsSchema.shape.password })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    try {
      await resetPassword(db, parsed.data.token, parsed.data.password);
    } catch (err) {
      if (err instanceof InvalidResetTokenError) {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    }
    logSecurityEvent("password_reset_completed", {});
    return res.status(200).json({ message: "Contraseña actualizada. Ya puedes iniciar sesión con ella." });
  });

  return router;
}
