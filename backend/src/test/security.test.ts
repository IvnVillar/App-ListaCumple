import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createPgliteDb } from "../db/pglite";
import type { MetadataExtractor } from "../routes/ownerLists";

async function buildAppWithExtractor(extractor: MetadataExtractor): Promise<Express> {
  const db = await createPgliteDb();
  return createApp(db, extractor);
}

const stubExtractor: MetadataExtractor = async (url) => ({
  title: "Producto de prueba",
  image_url: null,
  price: null,
  currency: null,
  store_name: null,
  source_url: url,
  strategy_used: "json-ld",
  warnings: [],
});

describe("Endurecimiento de seguridad", () => {
  let app: Express;
  let token: string;

  beforeEach(async () => {
    app = await buildAppWithExtractor(stubExtractor);
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret" });
    token = register.body.token;
  });

  it("exige sesión para extraer metadatos (antes era público)", async () => {
    const withoutToken = await request(app)
      .post("/api/extract-metadata")
      .send({ url: "https://tienda.example/producto" });
    expect(withoutToken.status).toBe(401);

    const withToken = await request(app)
      .post("/api/extract-metadata")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://tienda.example/producto" });
    expect(withToken.status).toBe(200);
    expect(withToken.body.title).toBe("Producto de prueba");
  });

  it("añade cabeceras de seguridad (helmet) a las respuestas", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("aplica un límite de peticiones (rate limit) a las rutas de autenticación", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@example.com", password: "supersecret" });
    expect(res.headers["ratelimit-limit"]).toBeDefined();
  });

  it("rechaza con 429 tras superar el límite de peticiones de autenticación", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 25 }, () =>
        request(app).post("/api/auth/login").send({ email: "nadie@example.com", password: "incorrecta" })
      )
    );
    expect(attempts.some((res) => res.status === 429)).toBe(true);
  });
});
