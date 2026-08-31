import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "./testApp";

describe("Guardado libre (Mis guardados)", () => {
  let app: Express;
  let token: string;

  beforeEach(async () => {
    app = await buildTestApp();
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "ana@example.com", username: "ana", password: "supersecret" });
    token = register.body.token;
  });

  it("crea la lista de guardados la primera vez que se pide", async () => {
    const res = await request(app).get("/api/lists/default").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Mis guardados");
    expect(res.body.occasion_type).toBe("guardado");
    expect(res.body.is_default).toBe(true);
  });

  it("devuelve siempre la misma lista de guardados, no una nueva cada vez", async () => {
    const first = await request(app).get("/api/lists/default").set("Authorization", `Bearer ${token}`);
    const second = await request(app).get("/api/lists/default").set("Authorization", `Bearer ${token}`);
    expect(second.body.id).toBe(first.body.id);

    const lists = await request(app).get("/api/lists").set("Authorization", `Bearer ${token}`);
    expect(lists.body.filter((l: { is_default: boolean }) => l.is_default)).toHaveLength(1);
  });

  it("dos peticiones simultáneas no crean dos listas de guardados (condición de carrera)", async () => {
    const [first, second] = await Promise.all([
      request(app).get("/api/lists/default").set("Authorization", `Bearer ${token}`),
      request(app).get("/api/lists/default").set("Authorization", `Bearer ${token}`),
    ]);
    expect(first.body.id).toBe(second.body.id);

    const lists = await request(app).get("/api/lists").set("Authorization", `Bearer ${token}`);
    expect(lists.body.filter((l: { is_default: boolean }) => l.is_default)).toHaveLength(1);
  });

  it("no se puede eliminar la lista de guardados", async () => {
    const created = await request(app).get("/api/lists/default").set("Authorization", `Bearer ${token}`);
    const del = await request(app)
      .delete(`/api/lists/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(400);

    const stillThere = await request(app).get(`/api/lists/${created.body.id}`).set("Authorization", `Bearer ${token}`);
    expect(stillThere.status).toBe(200);
  });

  it("no se puede crear a mano una lista con ocasión 'guardado'", async () => {
    const res = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Trampa", occasion_type: "guardado" });
    expect(res.status).toBe(400);
  });
});
