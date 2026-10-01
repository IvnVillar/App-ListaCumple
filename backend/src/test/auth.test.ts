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
      .send({ email: "ana@example.com", username: "ana", password: "supersecret", accepted_terms: true, confirmed_age: true });

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
      .send({ email: "ana@example.com", username: "ana", password: "supersecret", accepted_terms: true, confirmed_age: true });
    const second = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana2", password: "otrapass123", accepted_terms: true, confirmed_age: true });

    expect(second.status).toBe(409);
  });

  it("no permite registrar el mismo nombre de usuario dos veces, aunque el email sea distinto", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret", accepted_terms: true, confirmed_age: true });
    const second = await request(app)
      .post("/api/auth/register")
      .send({ email: "otra@example.com", username: "ana", password: "otrapass123", accepted_terms: true, confirmed_age: true });

    expect(second.status).toBe(409);
  });

  it("rechaza un registro sin nombre de usuario o con un formato inválido", async () => {
    const missing = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", password: "supersecret", accepted_terms: true, confirmed_age: true });
    expect(missing.status).toBe(400);

    const invalid = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "a", password: "supersecret", accepted_terms: true, confirmed_age: true });
    expect(invalid.status).toBe(400);
  });

  it("dos registros simultáneos con el mismo email no provocan un 500 (condición de carrera)", async () => {
    const [first, second] = await Promise.all([
      request(app)
        .post("/api/auth/register")
        .send({ email: "carrera@example.com", username: "carrera1", password: "supersecret", accepted_terms: true, confirmed_age: true }),
      request(app)
        .post("/api/auth/register")
        .send({ email: "carrera@example.com", username: "carrera2", password: "otrapass123", accepted_terms: true, confirmed_age: true }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it("rechaza login con contraseña incorrecta", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret", accepted_terms: true, confirmed_age: true });
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
      .send({ email: "ana@example.com", username: "ana", password: "supersecret", accepted_terms: true, confirmed_age: true });
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
      .send({ email: "ana@example.com", username: "ana", password: "supersecret", accepted_terms: true, confirmed_age: true });
    const bea = await request(app)
      .post("/api/auth/register")
      .send({ email: "bea@example.com", username: "bea", password: "supersecret", accepted_terms: true, confirmed_age: true });

    const conflict = await request(app)
      .patch("/api/auth/username")
      .set("Authorization", `Bearer ${bea.body.token}`)
      .send({ username: "ana" });
    expect(conflict.status).toBe(409);

    const noAuth = await request(app).patch("/api/auth/username").send({ username: "algo" });
    expect(noAuth.status).toBe(401);
  });

  it("no registra sin aceptar los términos o sin confirmar la edad mínima (checklist legal)", async () => {
    const noTerms = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret", confirmed_age: true });
    expect(noTerms.status).toBe(400);

    const noAge = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret", accepted_terms: true });
    expect(noAge.status).toBe(400);
  });

  it("al eliminar la cuenta se borran también sus listas y artículos (derecho de supresión)", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret", accepted_terms: true, confirmed_age: true });
    const token = register.body.token;

    const list = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Cumpleaños", occasion_type: "cumpleanos" });
    await request(app)
      .post(`/api/lists/${list.body.id}/items`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Bicicleta" });

    const deletion = await request(app).delete("/api/auth/account").set("Authorization", `Bearer ${token}`);
    expect(deletion.status).toBe(204);

    const visitorView = await request(app).get(`/api/l/${list.body.share_token}`);
    expect(visitorView.status).toBe(404);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@example.com", password: "supersecret" });
    expect(login.status).toBe(401);
  });

  it("no deja eliminar la cuenta sin sesión", async () => {
    const noAuth = await request(app).delete("/api/auth/account");
    expect(noAuth.status).toBe(401);
  });

  it("bloquea la cuenta tras demasiados intentos fallidos seguidos, aunque luego se use la contraseña correcta", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret", accepted_terms: true, confirmed_age: true });

    for (let i = 0; i < 10; i++) {
      const attempt = await request(app)
        .post("/api/auth/login")
        .send({ email: "ana@example.com", password: "incorrecta" });
      expect(attempt.status).toBe(401);
    }

    const lockedWithRightPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@example.com", password: "supersecret" });
    expect(lockedWithRightPassword.status).toBe(423);
  });
});
