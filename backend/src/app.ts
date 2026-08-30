import express, { type Express } from "express";
import type { Db } from "./db";
import { extractMetadata } from "./extractMetadata";
import { FetchError } from "./fetchHtml";
import type { ExtractRequestBody } from "./types";
import { createAuthRouter } from "./routes/auth";
import { createOwnerListsRouter } from "./routes/ownerLists";
import { createVisitorListsRouter } from "./routes/visitorLists";

export function createApp(db: Db): Express {
  const app = express();
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
  app.use("/api/lists", createOwnerListsRouter(db));
  app.use("/api/l", createVisitorListsRouter(db));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  return app;
}
