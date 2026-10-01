import type { Mailer } from "./mailer";

const FROM = "Lista de Deseos <onboarding@resend.dev>";

/**
 * Sin RESEND_API_KEY configurada (p. ej. en local, o antes de darla de alta
 * en Render), no se envía ningún email de verdad — mismo patrón que
 * claudeSuggester sin ANTHROPIC_API_KEY: el resto del flujo (generar el
 * token, guardarlo, responder sin filtrar si el email existe) sigue
 * funcionando igual, solo que nadie recibe el correo hasta que haya clave.
 */
export const resendMailer: Mailer = async (to, resetUrl) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `RESEND_API_KEY no configurada: no se envía el email de recuperación a ${to}. Enlace generado: ${resetUrl}`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: "Recupera tu contraseña — Lista de Deseos",
      html: `
        <p>Has pedido restablecer tu contraseña en Lista de Deseos.</p>
        <p><a href="${resetUrl}">Elige una contraseña nueva</a></p>
        <p>Este enlace caduca en 1 hora. Si no has sido tú, ignora este correo — tu contraseña sigue siendo la misma.</p>
      `,
    }),
  });

  // No se relanza el error: un fallo del proveedor de email no debe romper
  // la respuesta genérica que ya le dimos al cliente (ni revelar nada sobre
  // si la cuenta existe). Queda en los logs para poder investigarlo.
  if (!res.ok) {
    console.error("Resend devolvió un error al enviar el email de recuperación:", res.status, await res.text());
  }
};
