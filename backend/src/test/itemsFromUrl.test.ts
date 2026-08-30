import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createPgliteDb } from "../db/pglite";
import type { MetadataExtractor } from "../routes/ownerLists";
import { FetchError } from "../fetchHtml";
import type { ExtractedMetadata } from "../types";

function stubExtractor(result: Partial<ExtractedMetadata>): MetadataExtractor {
  return async () => ({
    title: null,
    image_url: null,
    price: null,
    currency: null,
    store_name: null,
    source_url: "https://tienda.example/producto",
    strategy_used: "json-ld",
    warnings: [],
    ...result,
  });
}

async function buildAppWithExtractor(extractor: MetadataExtractor) {
  const db = await createPgliteDb();
  return createApp(db, extractor);
}

describe("Creación de artículos pegando una URL (spec sección 2.a)", () => {
  let app: Express;
  let token: string;
  let listId: string;

  async function setup(extractor: MetadataExtractor) {
    app = await buildAppWithExtractor(extractor);
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "owner@example.com", password: "supersecret" });
    token = register.body.token;
    const list = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Lista", occasion_type: "cumpleanos" });
    listId = list.body.id;
  }

  it("rellena título, imagen y precio automáticamente desde la URL", async () => {
    await setup(
      stubExtractor({
        title: "Auriculares inalámbricos",
        image_url: "https://tienda.example/img.jpg",
        price: 59.99,
        currency: "EUR",
        store_name: "tienda",
      })
    );

    const res = await request(app)
      .post(`/api/lists/${listId}/items`)
      .set("Authorization", `Bearer ${token}`)
      .send({ source_url: "https://tienda.example/producto" });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Auriculares inalámbricos");
    expect(res.body.image_url).toBe("https://tienda.example/img.jpg");
    expect(res.body.price).toBe("59.99");
    expect(res.body.extraction.strategy_used).toBe("json-ld");
  });

  it("los campos enviados a mano tienen prioridad sobre los extraídos", async () => {
    await setup(
      stubExtractor({
        title: "Título original de la tienda",
        price: 59.99,
      })
    );

    const res = await request(app)
      .post(`/api/lists/${listId}/items`)
      .set("Authorization", `Bearer ${token}`)
      .send({ source_url: "https://tienda.example/producto", title: "Mi título corregido", price: 45 });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Mi título corregido");
    expect(res.body.price).toBe("45.00");
  });

  it("si la extracción falla y no hay título manual, pide completarlo (no bloquea con 500)", async () => {
    const failingExtractor: MetadataExtractor = async () => {
      throw new FetchError("La tienda respondió con estado 403");
    };
    await setup(failingExtractor);

    const res = await request(app)
      .post(`/api/lists/${listId}/items`)
      .set("Authorization", `Bearer ${token}`)
      .send({ source_url: "https://tienda-bloqueada.example/producto" });

    expect(res.status).toBe(422);
  });

  it("si la extracción falla pero hay título manual, el artículo se crea igualmente", async () => {
    const failingExtractor: MetadataExtractor = async () => {
      throw new FetchError("Timeout al contactar con la tienda");
    };
    await setup(failingExtractor);

    const res = await request(app)
      .post(`/api/lists/${listId}/items`)
      .set("Authorization", `Bearer ${token}`)
      .send({ source_url: "https://tienda-lenta.example/producto", title: "Lo pongo yo mismo" });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Lo pongo yo mismo");
  });

  it("permite editar un artículo ya creado con PATCH", async () => {
    await setup(stubExtractor({}));
    const created = await request(app)
      .post(`/api/lists/${listId}/items`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Original" });

    const patched = await request(app)
      .patch(`/api/lists/${listId}/items/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 30 });

    expect(patched.status).toBe(200);
    expect(patched.body.title).toBe("Original");
    expect(patched.body.price).toBe("30.00");
  });
});
