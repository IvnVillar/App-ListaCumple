import "express-async-errors";
import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { z } from "zod";
import type { Db } from "./db";
import { requireAuth } from "./auth/middleware";
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

const extractFromHtmlSchema = z.object({
  url: z.string().min(1),
  html: z.string().min(1),
  final_url: z.string().min(1).optional(),
});

export function createApp(
  db: Db,
  extractMetadata: MetadataExtractor = defaultExtractMetadata,
  suggester: Suggester = claudeSuggester
): Express {
  const app = express();
  const rateLimiters = createRateLimiters();
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
  app.use(cors());
  // 5mb en vez de los 100kb por defecto: /api/extract-metadata-from-html
  // recibe el HTML completo de una página que el propio cliente ya descargó.
  app.use(express.json({ limit: "5mb" }));
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

  app.use("/api/auth", rateLimiters.auth, createAuthRouter(db, rateLimiters.writeAction));
  app.use("/api/friends", createFriendsRouter(db, suggester, rateLimiters.writeAction));
  app.use("/api/lists", createOwnerListsRouter(db, extractMetadata));
  app.use("/api/l", createVisitorListsRouter(db, rateLimiters.writeAction));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Red de seguridad: cualquier error no capturado explícitamente (fallo de
  // BD, etc.) llega aquí gracias a express-async-errors en vez de tumbar el
  // proceso con una promesa rechazada sin gestionar.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Error no manejado:", err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Error interno del servidor" });
  });

  return app;
}
