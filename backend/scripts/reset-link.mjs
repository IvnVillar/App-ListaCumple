// Genera un enlace de recuperación de contraseña para una cuenta, sin enviar
// ningún email: se lo pasas a la persona por otro canal (p. ej. WhatsApp) y
// es ella quien elige su contraseña nueva. El enlace caduca en 1 hora y vale
// una sola vez.
//
// Uso:
//   ADMIN_KEY='la-clave' node scripts/reset-link.mjs amigo@ejemplo.com
// Opcional: API_URL para apuntar a otro backend (por defecto, producción).
const [, , email] = process.argv;
const key = process.env.ADMIN_KEY;
const apiUrl = process.env.API_URL ?? "https://app-listacumple.onrender.com";

if (!email || !key) {
  console.error("Uso: ADMIN_KEY='...' node scripts/reset-link.mjs <email>");
  process.exit(1);
}

const res = await fetch(`${apiUrl}/api/admin/password-reset-link`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-admin-key": key },
  body: JSON.stringify({ email }),
});
const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error(`Error ${res.status}: ${body.error ?? "respuesta inesperada"}`);
  process.exit(1);
}
console.log(body.reset_url);
