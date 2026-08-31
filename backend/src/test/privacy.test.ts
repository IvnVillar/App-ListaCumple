import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "./testApp";

const FORBIDDEN_KEYS = ["reserver_alias", "contributor_alias", "reservation_id", "amount"];

function assertNoLeak(value: unknown, forbiddenStrings: string[]) {
  const serialized = JSON.stringify(value);
  for (const key of FORBIDDEN_KEYS) {
    expect(serialized).not.toContain(`"${key}"`);
  }
  for (const forbidden of forbiddenStrings) {
    expect(serialized).not.toContain(forbidden);
  }
}

describe("Aislamiento owner/visitor (spec sección 4 y 7)", () => {
  let app: Express;
  let ownerToken: string;
  let listId: string;
  let shareToken: string;
  let soloItemId: string;
  let groupItemId: string;

  beforeEach(async () => {
    app = await buildTestApp();

    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "owner@example.com", username: "owner", password: "supersecret" });
    ownerToken = register.body.token;

    const list = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Cumple de Marta", occasion_type: "cumpleanos" });
    listId = list.body.id;
    shareToken = list.body.share_token;

    const soloItem = await request(app)
      .post(`/api/lists/${listId}/items`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Libro", price: 20 });
    soloItemId = soloItem.body.id;

    const groupItem = await request(app)
      .post(`/api/lists/${listId}/items`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Bici", price: 100, is_group_gift: true });
    groupItemId = groupItem.body.id;
  });

  it("nunca expone alias ni importes al dueño, ni siquiera tras reservas/aportaciones", async () => {
    await request(app).post(`/api/l/${shareToken}/items/${soloItemId}/reserve`).send({ alias: "Ana" });
    await request(app)
      .post(`/api/l/${shareToken}/items/${groupItemId}/contribute`)
      .send({ alias: "Bea Contribuyente", amount: 40 });

    const ownerView = await request(app)
      .get(`/api/lists/${listId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(ownerView.status).toBe(200);
    assertNoLeak(ownerView.body, ["Ana", "Bea Contribuyente"]);

    const items = ownerView.body.items as Array<{ id: string; has_destination: boolean }>;
    expect(items.find((i) => i.id === soloItemId)?.has_destination).toBe(true);
    expect(items.find((i) => i.id === groupItemId)?.has_destination).toBe(true);
    expect(ownerView.body.items_with_destination).toBe(2);
    expect(ownerView.body.items_total).toBe(2);
  });

  it("el dueño no ve destino en artículos sin reservar", async () => {
    const ownerView = await request(app)
      .get(`/api/lists/${listId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    const items = ownerView.body.items as Array<{ has_destination: boolean }>;
    expect(items.every((i) => i.has_destination === false)).toBe(true);
    expect(ownerView.body.items_with_destination).toBe(0);
  });

  it("el visitante sí ve el alias del reservante para coordinarse con otros visitantes", async () => {
    await request(app).post(`/api/l/${shareToken}/items/${soloItemId}/reserve`).send({ alias: "Ana" });

    const visitorView = await request(app).get(`/api/l/${shareToken}`);
    const item = visitorView.body.items.find((i: { id: string }) => i.id === soloItemId);

    expect(item.status).toBe("reserved");
    expect(item.reserver_alias).toBe("Ana");
  });

  it("un artículo ya reservado no puede reservarse dos veces", async () => {
    await request(app).post(`/api/l/${shareToken}/items/${soloItemId}/reserve`).send({ alias: "Ana" });
    const second = await request(app)
      .post(`/api/l/${shareToken}/items/${soloItemId}/reserve`)
      .send({ alias: "Carlos" });

    expect(second.status).toBe(409);
  });

  it("el bote común acumula aportaciones de varios visitantes y calcula lo restante", async () => {
    await request(app)
      .post(`/api/l/${shareToken}/items/${groupItemId}/contribute`)
      .send({ alias: "Bea", amount: 40 });
    await request(app)
      .post(`/api/l/${shareToken}/items/${groupItemId}/contribute`)
      .send({ alias: "Carlos", amount: 25 });

    const visitorView = await request(app).get(`/api/l/${shareToken}`);
    const item = visitorView.body.items.find((i: { id: string }) => i.id === groupItemId);

    expect(item.group_gift.total_contributed).toBe(65);
    expect(item.group_gift.remaining).toBe(35);
    expect(item.reserver_alias).toBeNull();
  });

  it("un visitante no puede reservar un item que es bote común, ni aportar a uno que no lo es", async () => {
    const reserveGroup = await request(app)
      .post(`/api/l/${shareToken}/items/${groupItemId}/reserve`)
      .send({ alias: "Ana" });
    expect(reserveGroup.status).toBe(400);

    const contributeSolo = await request(app)
      .post(`/api/l/${shareToken}/items/${soloItemId}/contribute`)
      .send({ alias: "Ana", amount: 5 });
    expect(contributeSolo.status).toBe(400);
  });

  it("un share_token inexistente devuelve 404, no filtra por id incremental", async () => {
    const response = await request(app).get("/api/l/00000000-0000-0000-0000-000000000000");
    expect(response.status).toBe(404);
  });

  it("otro usuario no puede ver ni borrar la lista de otro dueño", async () => {
    const otherRegister = await request(app)
      .post("/api/auth/register")
      .send({ email: "otro@example.com", username: "otro", password: "supersecret" });
    const otherToken = otherRegister.body.token;

    const getAsOther = await request(app)
      .get(`/api/lists/${listId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(getAsOther.status).toBe(404);

    const deleteAsOther = await request(app)
      .delete(`/api/lists/${listId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(deleteAsOther.status).toBe(404);
  });
});
