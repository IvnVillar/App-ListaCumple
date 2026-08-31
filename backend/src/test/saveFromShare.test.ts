import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "./testApp";

describe("Re-guardar (spec tipo Pinterest)", () => {
  let app: Express;
  let ownerToken: string;
  let saverToken: string;
  let shareToken: string;
  let itemId: string;

  beforeEach(async () => {
    app = await buildTestApp();

    const owner = await request(app)
      .post("/api/auth/register")
      .send({ email: "owner@example.com", username: "owner", password: "supersecret" });
    ownerToken = owner.body.token;

    const saver = await request(app)
      .post("/api/auth/register")
      .send({ email: "saver@example.com", username: "saver", password: "supersecret" });
    saverToken = saver.body.token;

    const list = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Cumple de Manu", occasion_type: "cumpleanos" });
    shareToken = list.body.share_token;

    const item = await request(app)
      .post(`/api/lists/${list.body.id}/items`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Polo azul", price: 25, store_name: "Zara", notes: "Talla M" });
    itemId = item.body.id;
  });

  it("copia el artículo a 'Mis guardados' del que lo guarda, con sus mismos datos", async () => {
    const save = await request(app)
      .post("/api/lists/default/save")
      .set("Authorization", `Bearer ${saverToken}`)
      .send({ share_token: shareToken, item_id: itemId });

    expect(save.status).toBe(201);
    expect(save.body.title).toBe("Polo azul");
    expect(save.body.price).toBe("25.00");
    expect(save.body.store_name).toBe("Zara");
    expect(save.body.is_group_gift).toBe(false);

    const defaultList = await request(app)
      .get("/api/lists/default")
      .set("Authorization", `Bearer ${saverToken}`);
    expect(defaultList.body.id).toBe(save.body.list_id);
  });

  it("no toca la lista ni el artículo original del dueño", async () => {
    await request(app)
      .post("/api/lists/default/save")
      .set("Authorization", `Bearer ${saverToken}`)
      .send({ share_token: shareToken, item_id: itemId });

    const ownerLists = await request(app).get("/api/lists").set("Authorization", `Bearer ${ownerToken}`);
    expect(ownerLists.body).toHaveLength(1);
    expect(ownerLists.body[0].title).toBe("Cumple de Manu");
  });

  it("devuelve 404 si el share_token o el item_id no existen", async () => {
    const badShareToken = await request(app)
      .post("/api/lists/default/save")
      .set("Authorization", `Bearer ${saverToken}`)
      .send({ share_token: "00000000-0000-0000-0000-000000000000", item_id: itemId });
    expect(badShareToken.status).toBe(404);

    const badItemId = await request(app)
      .post("/api/lists/default/save")
      .set("Authorization", `Bearer ${saverToken}`)
      .send({ share_token: shareToken, item_id: "00000000-0000-0000-0000-000000000000" });
    expect(badItemId.status).toBe(404);
  });

  it("exige sesión para guardar", async () => {
    const res = await request(app)
      .post("/api/lists/default/save")
      .send({ share_token: shareToken, item_id: itemId });
    expect(res.status).toBe(401);
  });
});
