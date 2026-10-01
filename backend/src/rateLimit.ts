import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

export interface RateLimiters {
  // Login/registro: lo más sensible a fuerza bruta de contraseñas o
  // registro masivo de cuentas.
  auth: RateLimitRequestHandler;
  // Extraer metadatos hace que el servidor visite una URL externa por cada
  // llamada — más cara que el resto y más fácil de convertir en un proxy
  // abierto si no se limita aparte.
  extract: RateLimitRequestHandler;
  // Acciones de escritura que alguien podría intentar automatizar:
  // solicitudes de amistad, reservas, aportaciones, cambiar de usuario.
  writeAction: RateLimitRequestHandler;
  // Sugerencias de regalo con IA: cada llamada factura contra la cuenta de
  // Anthropic (cuando haya una clave configurada) — un límite mucho más
  // bajo que el resto para que nadie pueda inflar la factura a base de pedir
  // sugerencias en bucle.
  ai: RateLimitRequestHandler;
  // Recuperación de contraseña: más estricto que el resto de /api/auth para
  // que nadie pueda usarlo para bombardear de emails una cuenta ajena ni
  // para probar tokens de reset por fuerza bruta.
  passwordReset: RateLimitRequestHandler;
  // Suelo general para cualquier otra ruta no cubierta por los de arriba.
  general: RateLimitRequestHandler;
}

/**
 * Fábrica en vez de instancias sueltas a nivel de módulo: cada limitador
 * lleva su propio contador en memoria, así que si fueran un singleton de
 * módulo lo compartirían TODAS las apps creadas en el mismo proceso —
 * incluidas las de tests distintos, dando 429 falsos entre pruebas que nada
 * tienen que ver entre sí. createApp() llama a esto una vez por instancia.
 */
export function createRateLimiters(): RateLimiters {
  return {
    auth: rateLimit({ windowMs: WINDOW_MS, limit: 20, standardHeaders: true, legacyHeaders: false }),
    extract: rateLimit({ windowMs: WINDOW_MS, limit: 30, standardHeaders: true, legacyHeaders: false }),
    writeAction: rateLimit({ windowMs: WINDOW_MS, limit: 30, standardHeaders: true, legacyHeaders: false }),
    ai: rateLimit({ windowMs: WINDOW_MS, limit: 10, standardHeaders: true, legacyHeaders: false }),
    passwordReset: rateLimit({ windowMs: WINDOW_MS, limit: 5, standardHeaders: true, legacyHeaders: false }),
    general: rateLimit({ windowMs: WINDOW_MS, limit: 300, standardHeaders: true, legacyHeaders: false }),
  };
}
