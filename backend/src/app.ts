import "express-async-errors";
import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { z } from "zod";
import type { Db } from "./db";
import { createRequireAuth } from "./auth/middleware";
import { extractMetadata as defaultExtractMetadata, extractMetadataFromHtml } from "./extractMetadata";
import { FetchError } from "./fetchHtml";
import { createRateLimiters } from "./rateLimit";
import type { ExtractRequestBody } from "./types";
import { createAuthRouter } from "./routes/auth";
import { createFriendsRouter } from "./routes/friends";
import { createOwnerListsRouter, type MetadataExtractor } from "./routes/ownerLists";
import { createVisitorListsRouter } from "./routes/visitorLists";
import { claudeSuggester } from "./ai/claudeSuggester";
import type { Suggester } from "./services/suggestions";
import { PRIVACY_POLICY_HTML, TERMS_OF_SERVICE_HTML } from "./legalPages";
import type { Mailer } from "./mail/mailer";
import { resendMailer } from "./mail/resendMailer";

const extractFromHtmlSchema = z.object({
  url: z.string().min(1),
  html: z.string().min(1),
  final_url: z.string().min(1).optional(),
});

// La app nativa (iOS/Android/Expo Go) no manda cabecera Origin — CORS solo
// afecta a llamadas desde un navegador. Hoy el único navegador real que nos
// llama es la propia previsualización web de Expo en desarrollo; no hay
// ninguna web pública todavía. ALLOWED_ORIGINS (coma-separado) permite sumar
// un dominio real el día que publiquemos una web, sin tocar código.
const DEFAULT_DEV_ORIGINS = ["http://localhost:8081", "http://localhost:19006"];
const ALLOWED_ORIGINS = [
  ...DEFAULT_DEV_ORIGINS,
  ...(process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
];

export function createApp(
  db: Db,
  extractMetadata: MetadataExtractor = defaultExtractMetadata,
  suggester: Suggester = claudeSuggester,
  mailer: Mailer = resendMailer
): Express {
  const app = express();
  const rateLimiters = createRateLimiters();
  const requireAuth = createRequireAuth(db);
  // Render está detrás de un único proxy inverso: sin esto, express-rate-limit
  // vería la IP interna del proxy para todo el mundo y compartiría el mismo
  // cupo entre todos los usuarios en vez de limitar por IP real.
  app.set("trust proxy", 1);
  app.use(
    helmet({
      // La API la consume la app (y en web, un origen distinto al del
      // backend) — el "same-origin" por defecto de helmet bloquearía esas
      // respuestas aunque CORS ya las permita.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        // Sin cabecera Origin = no es un navegador (app nativa, server-to-server,
        // health checks) — no es a quien CORS protege, se deja pasar.
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error("Origen no permitido por CORS"));
      },
    })
  );
  // Límite propio y más alto SOLO para esta ruta (recibe el HTML completo de
  // una página), montado antes del límite general: una vez que un body-parser
  // procesa el cuerpo, express.json() ve `req._body` ya puesto y no lo vuelve
  // a parsear, así que el límite de 100kb de abajo no le aplica a esta ruta.
  app.use("/api/extract-metadata-from-html", express.json({ limit: "5mb" }));
  // 100kb por defecto para el resto: de sobra para cualquier petición normal,
  // nada más aquí sube archivos.
  app.use(express.json({ limit: "100kb" }));
  app.use(rateLimiters.general);

  // Requiere sesión: sin esto, cualquiera (sin cuenta) podía hacer que el
  // servidor visitara cualquier URL a su antojo — un proxy abierto gratis.
  app.post("/api/extract-metadata", requireAuth, rateLimiters.extract, async (req, res) => {
    const body = req.body as ExtractRequestBody;
    const url = body?.url;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "El campo 'url' es obligatorio" });
    }

    try {
      const metadata = await extractMetadata(url);
      return res.json(metadata);
    } catch (err) {
      if (err instanceof FetchError) {
        return res.status(422).json({ error: err.message });
      }
      console.error("Error inesperado extrayendo metadatos:", err);
      return res.status(500).json({ error: "Error interno al extraer metadatos" });
    }
  });

  // Algunas tiendas bloquean la IP del propio servidor (proveedor cloud)
  // pero no la de una conexión residencial normal — el móvil no tiene ese
  // problema. Aquí el cliente ya trajo el HTML él mismo; el backend solo lo
  // analiza, sin volver a intentar la petición de red (por eso no hace
  // falta el guard SSRF de fetchHtml: no hay ninguna petición de red aquí).
  app.post("/api/extract-metadata-from-html", requireAuth, rateLimiters.extract, (req, res) => {
    const parsed = extractFromHtmlSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    try {
      const metadata = extractMetadataFromHtml(parsed.data.url, parsed.data.html, parsed.data.final_url);
      return res.json(metadata);
    } catch (err) {
      if (err instanceof FetchError) {
        return res.status(422).json({ error: err.message });
      }
      throw err;
    }
  });

  app.use(
    "/api/auth",
    rateLimiters.auth,
    createAuthRouter(db, rateLimiters.writeAction, rateLimiters.passwordReset, mailer)
  );
  app.use("/api/friends", createFriendsRouter(db, suggester, rateLimiters.writeAction, rateLimiters.ai));
  app.use("/api/lists", createOwnerListsRouter(db, extractMetadata));
  app.use("/api/l", createVisitorListsRouter(db, rateLimiters.writeAction));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // URL pública estable para los textos legales, sin montar hosting nuevo.
  app.get("/privacy", (_req, res) => res.type("html").send(PRIVACY_POLICY_HTML));
  app.get("/terms", (_req, res) => res.type("html").send(TERMS_OF_SERVICE_HTML));

  // Red de seguridad: cualquier error no capturado explícitamente (fallo de
  // BD, etc.) llega aquí gracias a express-async-errors en vez de tumbar el
  // proceso con una promesa rechazada sin gestionar.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    if (err instanceof Error && err.message === "Origen no permitido por CORS") {
      return res.status(403).json({ error: err.message });
    }
    // body-parser marca los cuerpos demasiado grandes con status 413 en vez
    // de lanzar un 500 — sin este caso, un límite de tamaño bien puesto se
    // veía en los logs como un fallo interno en vez de lo que realmente es.
    if (err instanceof Error && "status" in err && (err as { status?: number }).status === 413) {
      return res.status(413).json({ error: "El cuerpo de la petición es demasiado grande" });
    }
    console.error("Error no manejado:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  });

  return app;
}
