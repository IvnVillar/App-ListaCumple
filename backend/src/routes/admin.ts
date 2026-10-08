import { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { Db } from "../db";
import type { SendEmail } from "../mail/mailer";
import { sendReleaseBroadcast } from "../services/broadcast";
import { logSecurityEvent } from "../security/log";

const broadcastSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  build_url: z.string().url(),
  notes_html: z.string().trim().min(1).max(5000),
  only_email: z.string().trim().email().optional(),
});

/**
 * Protegida por una clave compartida (ADMIN_BROADCAST_KEY) en vez de por una
 * cuenta de usuario concreta: no hay ningún concepto de "rol admin" en la
 * app, y para un único operador esto es más simple que construir uno entero
 * solo para esta ruta. Sin la variable configurada, la ruta rechaza
 * cualquier petición — igual que el resto de funciones que dependen de una
 * clave externa, queda inerte hasta que se configura.
 */
export function createAdminRouter(db: Db, sendEmail: SendEmail, broadcastLimiter: RequestHandler): Router {
  const router = Router();

  router.post("/broadcast-release", broadcastLimiter, async (req, res) => {
    const adminKey = process.env.ADMIN_BROADCAST_KEY;
    if (!adminKey || req.header("x-admin-key") !== adminKey) {
      return res.status(401).json({ error: "No autorizado" });
    }

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

  return router;
}
