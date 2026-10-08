import type { Db } from "../db";
import type { SendEmail } from "../mail/mailer";

export interface ReleaseBroadcastInput {
  subject: string;
  buildUrl: string;
  notesHtml: string;
  // Prueba: manda el aviso solo a esta cuenta (que debe estar registrada),
  // saltándose la preferencia de avisos, para comprobar que el correo llega
  // antes de avisar a todo el mundo.
  onlyEmail?: string;
}

/**
 * Manda el aviso de nueva versión solo a quien no lo haya desactivado desde
 * Ajustes (release_notifications_enabled). Un envío que falla no tumba el
 * resto de la tanda: cuenta como `failed`, no como `sent`.
 */
export async function sendReleaseBroadcast(
  db: Db,
  sendEmail: SendEmail,
  { subject, buildUrl, notesHtml, onlyEmail }: ReleaseBroadcastInput
): Promise<{ sent: number; failed: number; skipped: number }> {
  const recipients = onlyEmail
    ? await db.query<{ email: string }>("SELECT email FROM users WHERE email = $1", [onlyEmail.toLowerCase()])
    : await db.query<{ email: string }>("SELECT email FROM users WHERE release_notifications_enabled = true");

  const html = `
    ${notesHtml}
    <p><a href="${buildUrl}">Descargar la nueva versión</a></p>
    <p style="color:#797080;font-size:12px">Puedes desactivar estos avisos desde Ajustes en la app.</p>
  `;

  let sent = 0;
  let failed = 0;
  for (const { email } of recipients.rows) {
    try {
      if (await sendEmail(email, subject, html)) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  if (onlyEmail) return { sent, failed, skipped: 0 };
  const total = await db.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users");
  return { sent, failed, skipped: Number(total.rows[0]?.count ?? 0) - recipients.rows.length };
}
