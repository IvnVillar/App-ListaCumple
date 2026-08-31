import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "./testApp";

describe("Caducidad de listas (modo puntual)", () => {
  let app: Express;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  it("un enlace caducado deja de funcionar para el visitante", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "owner@example.com", username: "owner", password: "supersecret" });
    const token = register.body.token;

    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const list = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Evento puntual", occasion_type: "puntual", expires_at: pastDate });

    const visitorView = await request(app).get(`/api/l/${list.body.share_token}`);
    expect(visitorView.status).toBe(410);
  });

  it("una lista sin expires_at nunca caduca", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "owner@example.com", username: "owner", password: "supersecret" });
    const token = register.body.token;

    const list = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Lista permanente", occasion_type: "cumpleanos" });

    const visitorView = await request(app).get(`/api/l/${list.body.share_token}`);
    expect(visitorView.status).toBe(200);
  });
});
