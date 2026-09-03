import rateLimit from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

// Login/registro: lo más sensible a fuerza bruta de contraseñas o registro
// masivo de cuentas.
export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Extraer metadatos hace que el servidor visite una URL externa por cada
// llamada — más cara que el resto y más fácil de convertir en un proxy
// abierto si no se limita aparte.
export const extractLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Acciones de escritura que alguien podría intentar automatizar: solicitudes
// de amistad, reservas, aportaciones.
export const writeActionLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Suelo general para cualquier otra ruta no cubierta por los límites de arriba.
export const generalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
