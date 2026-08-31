import "express-async-errors";
import cors from "cors";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { Db } from "./db";
import { extractMetadata as defaultExtractMetadata } from "./extractMetadata";
import { FetchError } from "./fetchHtml";
import type { ExtractRequestBody } from "./types";
import { createAuthRouter } from "./routes/auth";
import { createFriendsRouter } from "./routes/friends";
import { createOwnerListsRouter, type MetadataExtractor } from "./routes/ownerLists";
import { createVisitorListsRouter } from "./routes/visitorLists";

export function createApp(db: Db, extractMetadata: MetadataExtractor = defaultExtractMetadata): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post("/api/extract-metadata", async (req, res) => {
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

  app.use("/api/auth", createAuthRouter(db));
  app.use("/api/friends", createFriendsRouter(db));
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
