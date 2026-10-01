import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "../auth/password";
import type { Db } from "../db";
import type { Mailer } from "../mail/mailer";

export class InvalidResetTokenError extends Error {}

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

// La web es la única superficie con la que funciona un enlace de email (no
// hay deep link nativo configurado) — RENDER_EXTERNAL_URL no sirve aquí
// porque esa variable la rellena Render con el dominio del propio BACKEND,
// no el de la web; por eso WEB_APP_URL es una variable propia.
const WEB_APP_URL = process.env.WEB_APP_URL ?? "https://lista-de-deseos-web.onrender.com";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Nunca revela si el email existe (checklist: "prevent user enumeration") —
 * tanto si hay cuenta como si no, la función vuelve sin lanzar nada y la
 * ruta que la llama responde siempre el mismo mensaje genérico.
 */
export async function requestPasswordReset(db: Db, mailer: Mailer, email: string): Promise<void> {
  const result = await db.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user) return;

  const rawToken = randomBytes(32).toString("hex");
  // Se guarda el HASH del token, no el token en claro — igual que con la
  // contraseña: una fuga de la base de datos no basta por sí sola para
  // resetear la contraseña de nadie.
  await db.query(
    "UPDATE users SET password_reset_token_hash = $2, password_reset_expires_at = now() + ($3 * interval '1 millisecond') WHERE id = $1",
    [user.id, hashToken(rawToken), TOKEN_TTL_MS]
  );

  const resetUrl = `${WEB_APP_URL}/reset-password?token=${rawToken}`;
  await mailer(email, resetUrl);
}

export async function resetPassword(db: Db, rawToken: string, newPassword: string): Promise<void> {
  const result = await db.query<{ id: string }>(
    "SELECT id FROM users WHERE password_reset_token_hash = $1 AND password_reset_expires_at > now()",
    [hashToken(rawToken)]
  );
  const user = result.rows[0];
  if (!user) throw new InvalidResetTokenError("El enlace no es válido o ha caducado");

  const passwordHash = await hashPassword(newPassword);
  await db.query(
    `UPDATE users
     SET password_hash = $2,
         password_reset_token_hash = NULL,
         password_reset_expires_at = NULL,
         token_version = token_version + 1,
         failed_login_attempts = 0,
         locked_until = NULL
     WHERE id = $1`,
    [user.id, passwordHash]
  );
}
