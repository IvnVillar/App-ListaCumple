import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createPgliteDb } from "../db/pglite";

describe("Enlace de recuperación generado por el administrador", () => {
  let app: Express;

  beforeEach(async () => {
    app = createApp(await createPgliteDb());
    process.env.ADMIN_BROADCAST_KEY = "test-admin-key";
  });

  afterEach(() => {
    delete process.env.ADMIN_BROADCAST_KEY;
  });

  async function register(email: string, username: string) {
    await request(app)
      .post("/api/auth/register")
      .send({ email, username, password: "supersecret", accepted_terms: true, confirmed_age: true });
  }

  it("exige la clave de administrador", async () => {
    await register("ana@example.com", "ana");
    const noKey = await request(app).post("/api/admin/password-reset-link").send({ email: "ana@example.com" });
    expect(noKey.status).toBe(401);
    const wrong = await request(app)
      .post("/api/admin/password-reset-link")
      .set("x-admin-key", "otra")
      .send({ email: "ana@example.com" });
    expect(wrong.status).toBe(401);
  });

  it("devuelve un enlace que permite elegir contraseña nueva, sin mandar ningún email", async () => {
    await register("ana@example.com", "ana");

    const res = await request(app)
      .post("/api/admin/password-reset-link")
      .set("x-admin-key", "test-admin-key")
      .send({ email: "ana@example.com" });
    expect(res.status).toBe(200);

    const token = new URL(res.body.reset_url).searchParams.get("token")!;
    const reset = await request(app).post("/api/auth/reset-password").send({ token, password: "nuevasecreta123" });
    expect(reset.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@example.com", password: "nuevasecreta123" });
    expect(login.status).toBe(200);
  });

  it("responde 404 si no existe la cuenta", async () => {
    const res = await request(app)
      .post("/api/admin/password-reset-link")
      .set("x-admin-key", "test-admin-key")
      .send({ email: "nadie@example.com" });
    expect(res.status).toBe(404);
  });
});
