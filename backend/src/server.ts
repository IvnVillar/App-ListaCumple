import express from "express";
import { extractMetadata } from "./extractMetadata";
import { FetchError } from "./fetchHtml";
import type { ExtractRequestBody } from "./types";

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

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});
