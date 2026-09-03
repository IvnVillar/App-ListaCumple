import "express-async-errors";
import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import type { Db } from "./db";
import { requireAuth } from "./auth/middleware";
import { extractMetadata as defaultExtractMetadata } from "./extractMetadata";
import { FetchError } from "./fetchHtml";
import { authLimiter, extractLimiter, generalLimiter } from "./rateLimit";
import type { ExtractRequestBody } from "./types";
import { createAuthRouter } from "./routes/auth";
import { createFriendsRouter } from "./routes/friends";
import { createOwnerListsRouter, type MetadataExtractor } from "./routes/ownerLists";
import { createVisitorListsRouter } from "./routes/visitorLists";
import { claudeSuggester } from "./ai/claudeSuggester";
import type { Suggester } from "./services/suggestions";

export function createApp(
  db: Db,
  extractMetadata: MetadataExtractor = defaultExtractMetadata,
  suggester: Suggester = claudeSuggester
): Express {
  const app = express();
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
  app.use(express.json());
  app.use(generalLimiter);

  // Requiere sesión: sin esto, cualquiera (sin cuenta) podía hacer que el
  // servidor visitara cualquier URL a su antojo — un proxy abierto gratis.
  app.post("/api/extract-metadata", requireAuth, extractLimiter, async (req, res) => {
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

  app.use("/api/auth", authLimiter, createAuthRouter(db));
  app.use("/api/friends", createFriendsRouter(db, suggester));
  app.use("/api/lists", createOwnerListsRouter(db, extractMetadata));
  app.use("/api/l", createVisitorListsRouter(db));

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
