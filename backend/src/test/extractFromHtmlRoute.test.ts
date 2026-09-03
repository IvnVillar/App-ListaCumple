import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "./testApp";

describe("POST /api/extract-metadata-from-html (spec: el móvil descarga cuando la tienda bloquea al servidor)", () => {
  let app: Express;
  let token: string;

  beforeEach(async () => {
    app = await buildTestApp();
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret" });
    token = register.body.token;
  });

  it("exige sesión", async () => {
    const res = await request(app)
      .post("/api/extract-metadata-from-html")
      .send({ url: "https://tienda.example/producto", html: "<html></html>" });
    expect(res.status).toBe(401);
  });

  it("analiza el HTML enviado y devuelve los campos extraídos", async () => {
    const html = `<html><head>
      <meta property="og:title" content="Polo traído por el móvil" />
      <meta property="og:image" content="/img.jpg" />
      <meta property="product:price:amount" content="25.50" />
      <meta property="product:price:currency" content="EUR" />
    </head></html>`;

    const res = await request(app)
      .post("/api/extract-metadata-from-html")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://tienda-bloqueada.example/x", html, final_url: "https://tienda-bloqueada.example/x" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Polo traído por el móvil");
    expect(res.body.price).toBe(25.5);
    expect(res.body.image_url).toBe("https://tienda-bloqueada.example/img.jpg");
  });

  it("rechaza una petición sin html o sin url", async () => {
    const missingHtml = await request(app)
      .post("/api/extract-metadata-from-html")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://tienda.example/producto" });
    expect(missingHtml.status).toBe(400);

    const missingUrl = await request(app)
      .post("/api/extract-metadata-from-html")
      .set("Authorization", `Bearer ${token}`)
      .send({ html: "<html></html>" });
    expect(missingUrl.status).toBe(400);
  });
});
