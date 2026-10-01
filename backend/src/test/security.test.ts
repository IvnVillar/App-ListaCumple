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
      .send({ email: "ana@example.com", username: "ana", password: "supersecret", accepted_terms: true, confirmed_age: true });
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

  it("sirve la Política de Privacidad y los Términos de Servicio en una URL pública (checklist legal)", async () => {
    const privacy = await request(app).get("/privacy");
    expect(privacy.status).toBe(200);
    expect(privacy.text).toContain("Política de Privacidad");

    const terms = await request(app).get("/terms");
    expect(terms.status).toBe(200);
    expect(terms.text).toContain("Términos de Servicio");
  });

  it("rechaza peticiones de navegador desde un origen no permitido (CORS)", async () => {
    const blocked = await request(app).get("/health").set("Origin", "https://sitio-cualquiera.example");
    expect(blocked.status).toBe(403);

    const allowed = await request(app).get("/health").set("Origin", "http://localhost:8081");
    expect(allowed.status).toBe(200);

    const noOrigin = await request(app).get("/health");
    expect(noOrigin.status).toBe(200);
  });

  it("rechaza un cuerpo de petición demasiado grande en rutas normales", async () => {
    const hugeNotes = "a".repeat(200_000);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@example.com", password: hugeNotes });
    expect(res.status).toBe(413);
  });

  it("limita las peticiones a las sugerencias de IA, mucho más estricto que el resto (control de coste)", async () => {
    const friend = await request(app)
      .post("/api/auth/register")
      .send({ email: "bea@example.com", username: "bea", password: "supersecret", accepted_terms: true, confirmed_age: true });
    const friendToken = friend.body.token;
    const friendId = JSON.parse(Buffer.from(friendToken.split(".")[1], "base64").toString()).userId;

    const sent = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "bea" });
    await request(app)
      .post(`/api/friends/requests/${sent.body.friendship.id}/accept`)
      .set("Authorization", `Bearer ${friendToken}`);

    const attempts = await Promise.all(
      Array.from({ length: 11 }, () =>
        request(app).get(`/api/friends/${friendId}/suggestions`).set("Authorization", `Bearer ${token}`)
      )
    );
    expect(attempts.some((res) => res.status === 429)).toBe(true);
  });
});
