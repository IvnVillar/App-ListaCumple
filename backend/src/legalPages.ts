// Páginas legales servidas por el propio backend (checklist: Política de
// Privacidad y Términos de Servicio necesitan una URL pública estable; esto
// nos la da gratis, sin montar web ni hosting nuevo).
//
// Datos que dependen de una decisión del responsable de la app, no del
// código: si cambian (email de contacto, nombre comercial, edad mínima...),
// hay que actualizar también el texto, no solo este archivo.
const RESPONSABLE = "Iván Villar Naredo";
const PAIS = "España";
const EDAD_MINIMA = 16;
const CONTACTO_NOTA =
  "Todavía no existe un email dedicado para la app (está en fase alfa cerrada " +
  "con amigos). Para ejercer cualquiera de estos derechos, usa la opción " +
  "«Eliminar mi cuenta» en Ajustes (cubre el borrado de tus datos) o contacta " +
  "directamente con Iván Villar Naredo por los canales habituales.";
const ULTIMA_ACTUALIZACION = "1 de octubre de 2026";

function page(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — Lista de Deseos</title>
<style>
  body { font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; max-width: 680px; margin: 0 auto; padding: 32px 20px 64px; color: #241B2F; line-height: 1.55; background: #FFF9F6; }
  h1 { font-size: 26px; margin-bottom: 4px; }
  h2 { font-size: 18px; margin-top: 32px; }
  .meta { color: #797080; font-size: 14px; margin-bottom: 32px; }
  ul { padding-left: 20px; }
  a { color: #CC3E6B; }
</style>
</head>
<body>
<h1>${title}</h1>
<p class="meta">Última actualización: ${ULTIMA_ACTUALIZACION}</p>
${bodyHtml}
</body>
</html>`;
}

export const PRIVACY_POLICY_HTML = page(
  "Política de Privacidad",
  `
<h2>Responsable del tratamiento</h2>
<p>${RESPONSABLE}, que opera esta app desde ${PAIS}.</p>

<h2>Qué datos recogemos</h2>
<ul>
  <li><strong>Al crear tu cuenta:</strong> email, nombre de usuario y contraseña (nunca se guarda en texto plano, solo un hash con bcrypt).</li>
  <li><strong>El contenido que guardas:</strong> los enlaces, imágenes, títulos y precios de los artículos que añades a tus listas.</li>
  <li><strong>Tus relaciones de amistad</strong> dentro de la app (quién pides como amigo, quién acepta).</li>
  <li><strong>Si alguien reserva o aporta a un regalo en una lista tuya sin tener cuenta:</strong> solo el alias (apodo) que esa persona escribe a mano, nunca ligado a ninguna cuenta.</li>
</ul>
<p>No pedimos ni guardamos más datos de los necesarios para que la app funcione: no hay nombre real, teléfono, dirección ni fecha de nacimiento.</p>

<h2>Para qué los usamos</h2>
<p>Únicamente para prestar el servicio que pides: crear y mostrar tus listas, gestionar tus amistades, permitir que quien tenga un enlace compartido vea esa lista y pueda reservar o aportar a un regalo, y prevenir abuso del servicio (límites de peticiones).</p>
<p>La app tiene una función de sugerencias de regalo con inteligencia artificial que, si está activa, envía a Anthropic (proveedor del modelo) lo que un amigo tuyo tiene guardado para generar ideas. Actualmente esta función está <strong>desactivada</strong> (no hay ninguna clave de API configurada), así que ningún dato se envía a Anthropic en este momento.</p>

<h2>Con quién compartimos datos</h2>
<p>No vendemos ni cedemos tus datos a terceros con fines publicitarios. Usamos estos proveedores únicamente como infraestructura técnica para que la app funcione:</p>
<ul>
  <li><strong>Neon</strong> — aloja la base de datos.</li>
  <li><strong>Render</strong> — aloja el servidor de la app.</li>
  <li><strong>Expo / EAS</strong> — distribuye las versiones instalables de la app.</li>
  <li><strong>Anthropic</strong> — solo si activamos las sugerencias de regalo con IA (hoy inactivas).</li>
</ul>
<p>Alguno de estos proveedores puede procesar datos fuera de España o la Unión Europea (p. ej. en EE. UU.); según sus propias políticas de privacidad, aplican medidas de seguridad acordes al RGPD.</p>

<h2>Cuánto tiempo conservamos tus datos</h2>
<p>Mientras tu cuenta exista. Si la borras, se elimina todo lo asociado a ella.</p>

<h2>Tus derechos</h2>
<p>Puedes acceder, rectificar, exportar o eliminar tus datos, así como oponerte a su tratamiento. ${CONTACTO_NOTA}</p>

<h2>Menores de edad</h2>
<p>Esta app no está dirigida a menores de ${EDAD_MINIMA} años y no recogemos conscientemente datos de personas por debajo de esa edad.</p>

<h2>Seguridad</h2>
<p>Las contraseñas se cifran con bcrypt, las conexiones viajan por HTTPS y aplicamos límites de peticiones para dificultar el abuso automatizado.</p>

<h2>Si usas la versión web</h2>
<p>La versión web de la app guarda tu sesión en el almacenamiento local de tu navegador (localStorage), con el único propósito de mantenerte conectado — el mismo papel que cumple en el móvil. No usamos cookies ni almacenamiento local con fines de analítica o publicidad, así que no hace falta un aviso de cookies para esto: es estrictamente necesario para el servicio que has pedido.</p>

<h2>Cambios en esta política</h2>
<p>Si la cambiamos de forma relevante, actualizaremos la fecha de arriba.</p>
`
);

export const TERMS_OF_SERVICE_HTML = page(
  "Términos de Servicio",
  `
<h2>Aceptación</h2>
<p>Al crear una cuenta en Lista de Deseos aceptas estos términos y la <a href="/privacy">Política de Privacidad</a>.</p>

<h2>Qué es este servicio</h2>
<p>Lista de Deseos es una app para guardar cosas que te gustan, compartirlas con amigos y coordinar quién regala qué. Está en <strong>fase de desarrollo (alfa)</strong>: puede cambiar, tener errores o estar temporalmente no disponible, sin garantía de tiempo de actividad.</p>

<h2>Requisitos para usarla</h2>
<p>Debes tener al menos ${EDAD_MINIMA} años y dar información veraz al registrarte.</p>

<h2>Tu cuenta</h2>
<p>Eres responsable de mantener segura tu contraseña. No compartas tu cuenta ni intentes acceder a la de otra persona.</p>

<h2>Uso aceptable</h2>
<p>No puedes usar la app para fines ilegales, para suplantar a otra persona, ni para intentar vulnerar su seguridad (incluidos los límites de peticiones).</p>

<h2>Tu contenido</h2>
<p>Lo que guardas (enlaces, listas, notas) sigue siendo tuyo. Nos das permiso únicamente para almacenarlo y mostrarlo a quien tú decidas compartirlo (tus amigos o quien reciba tu enlace). No somos responsables del contenido de las webs externas que enlazas.</p>

<h2>Reservas y aportaciones de regalo</h2>
<p>La función de reservar o "aportar" a un regalo es solo un sistema de coordinación informal entre las personas que usan la app. <strong>No procesamos pagos ni intervenimos en ningún movimiento de dinero real</strong> — cualquier intercambio económico que decidáis hacer ocurre fuera de la app, bajo vuestra responsabilidad.</p>

<h2>Disponibilidad y cambios</h2>
<p>El servicio se ofrece "tal cual", mientras seguimos desarrollándolo. Podemos cambiar o retirar funciones.</p>

<h2>Cancelación</h2>
<p>Puedes eliminar tu cuenta cuando quieras desde Ajustes. Podemos suspender cuentas que incumplan estos términos.</p>

<h2>Límite de responsabilidad</h2>
<p>Dentro de lo que permite la ley, no somos responsables de daños indirectos derivados del uso de la app.</p>

<h2>Ley aplicable</h2>
<p>Estos términos se rigen por la legislación española.</p>

<h2>Contacto</h2>
<p>${CONTACTO_NOTA}</p>
`
);
