import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { createPgliteDb } from "../db/pglite";
import type { Suggester } from "../services/suggestions";

async function buildAppWithSuggester(suggester: Suggester) {
  const db = await createPgliteDb();
  return createApp(db, undefined, suggester);
}

describe("Sugerencias de regalo con IA", () => {
  let app: Express;
  let ownerToken: string;
  let ownerId: string;
  let friendToken: string;
  let strangerToken: string;
  let fakeSuggester: Suggester;

  beforeEach(async () => {
    fakeSuggester = vi.fn(async () => [{ title: "Bufanda a juego", reason: "Combina con lo que ya tiene guardado" }]);
    app = await buildAppWithSuggester(fakeSuggester);

    const owner = await request(app)
      .post("/api/auth/register")
      .send({ email: "owner@example.com", username: "owner", password: "supersecret" });
    ownerToken = owner.body.token;
    const decoded = JSON.parse(Buffer.from(ownerToken.split(".")[1], "base64").toString());
    ownerId = decoded.userId;

    const friend = await request(app)
      .post("/api/auth/register")
      .send({ email: "friend@example.com", username: "friend", password: "supersecret" });
    friendToken = friend.body.token;

    const stranger = await request(app)
      .post("/api/auth/register")
      .send({ email: "stranger@example.com", username: "stranger", password: "supersecret" });
    strangerToken = stranger.body.token;

    const send = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${friendToken}`)
      .send({ username: "owner" });
    await request(app)
      .post(`/api/friends/requests/${send.body.friendship.id}/accept`)
      .set("Authorization", `Bearer ${ownerToken}`);
  });

  it("no deja pedir sugerencias sobre alguien que no es tu amigo", async () => {
    const res = await request(app)
      .get(`/api/friends/${ownerId}/suggestions`)
      .set("Authorization", `Bearer ${strangerToken}`);
    expect(res.status).toBe(403);
    expect(fakeSuggester).not.toHaveBeenCalled();
  });

  it("no llama a la IA si el amigo no tiene nada guardado, y devuelve una lista vacía", async () => {
    const res = await request(app)
      .get(`/api/friends/${ownerId}/suggestions`)
      .set("Authorization", `Bearer ${friendToken}`);
    expect(res.status).toBe(200);
    expect(res.body.suggestions).toEqual([]);
    expect(fakeSuggester).not.toHaveBeenCalled();
  });

  it("basa las sugerencias en lo que el amigo tiene guardado, no en lo tuyo", async () => {
    const list = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Cumple", occasion_type: "cumpleanos" });
    await request(app)
      .post(`/api/lists/${list.body.id}/items`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Bufanda roja", store_name: "Zara" });

    const res = await request(app)
      .get(`/api/friends/${ownerId}/suggestions`)
      .set("Authorization", `Bearer ${friendToken}`);

    expect(res.status).toBe(200);
    expect(res.body.suggestions).toEqual([
      { title: "Bufanda a juego", reason: "Combina con lo que ya tiene guardado" },
    ]);
    expect(fakeSuggester).toHaveBeenCalledWith([{ title: "Bufanda roja", store_name: "Zara", notes: null }]);
  });

  it("si la IA falla, no rompe la petición: devuelve una lista vacía", async () => {
    const failingSuggester: Suggester = vi.fn(async () => {
      throw new Error("timeout hablando con el modelo");
    });
    const failingApp = await buildAppWithSuggester(failingSuggester);

    const owner = await request(failingApp)
      .post("/api/auth/register")
      .send({ email: "owner2@example.com", username: "owner2", password: "supersecret" });
    const list = await request(failingApp)
      .post("/api/lists")
      .set("Authorization", `Bearer ${owner.body.token}`)
      .send({ title: "Cumple", occasion_type: "cumpleanos" });
    await request(failingApp)
      .post(`/api/lists/${list.body.id}/items`)
      .set("Authorization", `Bearer ${owner.body.token}`)
      .send({ title: "Algo" });
    const decoded = JSON.parse(Buffer.from(owner.body.token.split(".")[1], "base64").toString());

    const friend = await request(failingApp)
      .post("/api/auth/register")
      .send({ email: "friend2@example.com", username: "friend2", password: "supersecret" });
    const send = await request(failingApp)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${friend.body.token}`)
      .send({ username: "owner2" });
    await request(failingApp)
      .post(`/api/friends/requests/${send.body.friendship.id}/accept`)
      .set("Authorization", `Bearer ${owner.body.token}`);

    const res = await request(failingApp)
      .get(`/api/friends/${decoded.userId}/suggestions`)
      .set("Authorization", `Bearer ${friend.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.suggestions).toEqual([]);
  });
});
