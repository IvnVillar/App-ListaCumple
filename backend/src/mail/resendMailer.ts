import type { Mailer, SendEmail } from "./mailer";

const FROM = "Lista de Deseos <onboarding@resend.dev>";

/**
 * Sin RESEND_API_KEY configurada (p. ej. en local, o antes de darla de alta
 * en Render), no se envía ningún email de verdad — mismo patrón que
 * claudeSuggester sin ANTHROPIC_API_KEY: el resto del flujo sigue
 * funcionando igual, solo que nadie recibe el correo hasta que haya clave.
 */
export const sendEmail: SendEmail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY no configurada: no se envía el email "${subject}" a ${to}.`);
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  // No se relanza el error: un fallo del proveedor de email no debe romper
  // la respuesta que ya le dimos al cliente. Queda en los logs para poder
  // investigarlo.
  if (!res.ok) {
    console.error(`Resend devolvió un error al enviar "${subject}" a ${to}:`, res.status, await res.text());
    return false;
  }
  return true;
};

export const resendMailer: Mailer = async (to, resetUrl) => {
  await sendEmail(
    to,
    "Recupera tu contraseña — Lista de Deseos",
    `
      <p>Has pedido restablecer tu contraseña en Lista de Deseos.</p>
      <p><a href="${resetUrl}">Elige una contraseña nueva</a></p>
      <p>Este enlace caduca en 1 hora. Si no has sido tú, ignora este correo — tu contraseña sigue siendo la misma.</p>
    `
  );
};
