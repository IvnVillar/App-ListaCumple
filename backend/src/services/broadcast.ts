import type { Db } from "../db";
import type { SendEmail } from "../mail/mailer";

export interface ReleaseBroadcastInput {
  subject: string;
  buildUrl: string;
  notesHtml: string;
}

/**
 * Manda el aviso de nueva versión solo a quien no lo haya desactivado desde
 * Ajustes (release_notifications_enabled). No lanza si un envío individual
 * falla — un email que rebota no debe tumbar el resto de la tanda; el
 * recuento de fallos queda en el resultado para poder revisarlo.
 */
export async function sendReleaseBroadcast(
  db: Db,
  sendEmail: SendEmail,
  { subject, buildUrl, notesHtml }: ReleaseBroadcastInput
): Promise<{ sent: number; failed: number; skipped: number }> {
  const [subscribed, total] = await Promise.all([
    db.query<{ email: string }>("SELECT email FROM users WHERE release_notifications_enabled = true"),
    db.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users"),
  ]);

  const html = `
    ${notesHtml}
    <p><a href="${buildUrl}">Descargar la nueva versión</a></p>
    <p style="color:#797080;font-size:12px">Puedes desactivar estos avisos desde Ajustes en la app.</p>
  `;

  let sent = 0;
  let failed = 0;
  for (const { email } of subscribed.rows) {
    try {
      await sendEmail(email, subject, html);
      sent++;
    } catch {
      failed++;
    }
  }

  const skipped = Number(total.rows[0]?.count ?? 0) - subscribed.rows.length;
  return { sent, failed, skipped };
}
