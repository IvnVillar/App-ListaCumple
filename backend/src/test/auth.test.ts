import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "./testApp";

describe("Autenticación", () => {
  let app: Express;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  it("registra un usuario y devuelve un token utilizable", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret" });

    expect(register.status).toBe(201);
    expect(register.body.token).toBeTruthy();

    const list = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${register.body.token}`)
      .send({ title: "Boda", occasion_type: "boda" });
    expect(list.status).toBe(201);
  });

  it("no permite registrar el mismo email dos veces", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret" });
    const second = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana2", password: "otrapass123" });

    expect(second.status).toBe(409);
  });

  it("no permite registrar el mismo nombre de usuario dos veces, aunque el email sea distinto", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret" });
    const second = await request(app)
      .post("/api/auth/register")
      .send({ email: "otra@example.com", username: "ana", password: "otrapass123" });

    expect(second.status).toBe(409);
  });

  it("rechaza un registro sin nombre de usuario o con un formato inválido", async () => {
    const missing = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", password: "supersecret" });
    expect(missing.status).toBe(400);

    const invalid = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "a", password: "supersecret" });
    expect(invalid.status).toBe(400);
  });

  it("dos registros simultáneos con el mismo email no provocan un 500 (condición de carrera)", async () => {
    const [first, second] = await Promise.all([
      request(app)
        .post("/api/auth/register")
        .send({ email: "carrera@example.com", username: "carrera1", password: "supersecret" }),
      request(app)
        .post("/api/auth/register")
        .send({ email: "carrera@example.com", username: "carrera2", password: "otrapass123" }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it("rechaza login con contraseña incorrecta", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret" });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@example.com", password: "incorrecta" });

    expect(login.status).toBe(401);
  });

  it("rechaza peticiones a rutas de dueño sin token", async () => {
    const response = await request(app).get("/api/lists");
    expect(response.status).toBe(401);
  });

  it("permite cambiar el nombre de usuario (p. ej. el autogenerado de una cuenta previa a esta función)", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret" });
    const token = register.body.token;

    const change = await request(app)
      .patch("/api/auth/username")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "ana_real" });
    expect(change.status).toBe(200);
    expect(change.body.username).toBe("ana_real");

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@example.com", password: "supersecret" });
    expect(login.body.username).toBe("ana_real");
  });

  it("no deja cambiar el usuario a uno ya en uso, ni sin sesión", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret" });
    const bea = await request(app)
      .post("/api/auth/register")
      .send({ email: "bea@example.com", username: "bea", password: "supersecret" });

    const conflict = await request(app)
      .patch("/api/auth/username")
      .set("Authorization", `Bearer ${bea.body.token}`)
      .send({ username: "ana" });
    expect(conflict.status).toBe(409);

    const noAuth = await request(app).patch("/api/auth/username").send({ username: "algo" });
    expect(noAuth.status).toBe(401);
  });
});
