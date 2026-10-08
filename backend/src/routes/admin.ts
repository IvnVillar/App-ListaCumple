import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Db } from "../db";
import type { SendEmail } from "../mail/mailer";
import { sendReleaseBroadcast } from "../services/broadcast";
import { requestPasswordReset } from "../services/passwordReset";
import { logSecurityEvent } from "../security/log";

const broadcastSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  build_url: z.string().url(),
  notes_html: z.string().trim().min(1).max(5000),
  only_email: z.string().trim().email().optional(),
});

const resetLinkSchema = z.object({ email: z.string().trim().toLowerCase().email() });

/**
 * Protegida por una clave compartida (ADMIN_BROADCAST_KEY) en vez de por una
 * cuenta de usuario concreta: no hay ningún concepto de "rol admin" en la
 * app, y para un único operador esto es más simple que construir uno entero
 * solo para estas rutas. Sin la variable configurada, las rutas rechazan
 * cualquier petición — igual que el resto de funciones que dependen de una
 * clave externa, quedan inertes hasta que se configura.
 */
const requireAdminKey: RequestHandler = (req, res, next) => {
  const adminKey = process.env.ADMIN_BROADCAST_KEY;
  if (!adminKey || req.header("x-admin-key") !== adminKey) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
};

export function createAdminRouter(
  db: Db,
  sendEmail: SendEmail,
  broadcastLimiter: RequestHandler,
  resetLinkLimiter: RequestHandler
): Router {
  const router = Router();

  router.post("/broadcast-release", broadcastLimiter, requireAdminKey, async (req, res) => {
    const parsed = broadcastSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const result = await sendReleaseBroadcast(db, sendEmail, {
      subject: parsed.data.subject,
      buildUrl: parsed.data.build_url,
      notesHtml: parsed.data.notes_html,
      onlyEmail: parsed.data.only_email,
    });
    logSecurityEvent("release_broadcast_sent", result);
    return res.json(result);
  });

  // Para quien no puede recibir el email de recuperación (hoy, cualquier
  // cuenta distinta de la del dueño de Resend): genera el mismo enlace de un
  // solo uso y 1 hora que se mandaría por correo, pero lo devuelve aquí en
  // vez de enviarlo, para pasárselo a la persona por otro canal. Es ella
  // quien elige la contraseña nueva; el administrador nunca la ve ni la fija.
  router.post("/password-reset-link", resetLinkLimiter, requireAdminKey, async (req, res) => {
    const parsed = resetLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    let resetUrl: string | null = null;
    await requestPasswordReset(db, async (_to, url) => {
      resetUrl = url;
    }, parsed.data.email);

    if (!resetUrl) return res.status(404).json({ error: "No hay ninguna cuenta con ese email" });
    logSecurityEvent("admin_reset_link_created", { email: parsed.data.email });
    return res.json({ reset_url: resetUrl });
  });

  return router;
}
