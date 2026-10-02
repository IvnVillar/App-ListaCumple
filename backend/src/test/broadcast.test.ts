import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import type { Db } from "../db";
import { createPgliteDb } from "../db/pglite";
import type { SendEmail } from "../mail/mailer";

describe("Aviso de nueva versión (broadcast de admin)", () => {
  let app: Express;
  let db: Db;
  let sentEmails: { to: string; subject: string }[];

  beforeEach(async () => {
    sentEmails = [];
    const stubSendEmail: SendEmail = async (to, subject) => {
      sentEmails.push({ to, subject });
    };
    db = await createPgliteDb();
    app = createApp(db, undefined, undefined, undefined, stubSendEmail);
    process.env.ADMIN_BROADCAST_KEY = "test-admin-key";
  });

  afterEach(() => {
    delete process.env.ADMIN_BROADCAST_KEY;
  });

  async function register(email: string, username: string): Promise<string> {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, username, password: "supersecret", accepted_terms: true, confirmed_age: true });
    return res.body.token as string;
  }

  const payload = {
    subject: "Nueva versión disponible",
    build_url: "https://expo.dev/accounts/x/builds/y",
    notes_html: "<p>Novedades: rediseño visual.</p>",
  };

  it("rechaza la petición sin la clave de admin, o con una incorrecta", async () => {
    const noKey = await request(app).post("/api/admin/broadcast-release").send(payload);
    expect(noKey.status).toBe(401);

    const wrongKey = await request(app)
      .post("/api/admin/broadcast-release")
      .set("x-admin-key", "clave-equivocada")
      .send(payload);
    expect(wrongKey.status).toBe(401);

    expect(sentEmails).toHaveLength(0);
  });

  it("rechaza si ADMIN_BROADCAST_KEY no está configurada en el servidor", async () => {
    delete process.env.ADMIN_BROADCAST_KEY;
    const res = await request(app)
      .post("/api/admin/broadcast-release")
      .set("x-admin-key", "cualquier-cosa")
      .send(payload);
    expect(res.status).toBe(401);
  });

  it("manda el aviso a todas las cuentas suscritas y salta a quien lo haya desactivado", async () => {
    await register("ana@example.com", "ana");
    const beaToken = await register("bea@example.com", "bea");
    await register("caro@example.com", "caro");

    await request(app)
      .patch("/api/auth/notification-preferences")
      .set("Authorization", `Bearer ${beaToken}`)
      .send({ release_notifications_enabled: false });

    const res = await request(app)
      .post("/api/admin/broadcast-release")
      .set("x-admin-key", "test-admin-key")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sent: 2, failed: 0, skipped: 1 });
    expect(sentEmails.map((e) => e.to).sort()).toEqual(["ana@example.com", "caro@example.com"]);
    expect(sentEmails[0].subject).toBe("Nueva versión disponible");
  });

  it("valida el cuerpo de la petición", async () => {
    const res = await request(app)
      .post("/api/admin/broadcast-release")
      .set("x-admin-key", "test-admin-key")
      .send({ subject: "", build_url: "no-es-una-url", notes_html: "" });
    expect(res.status).toBe(400);
  });

  it("limita las peticiones de difusión", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(app).post("/api/admin/broadcast-release").set("x-admin-key", "test-admin-key").send(payload)
      )
    );
    expect(attempts.some((res) => res.status === 429)).toBe(true);
  });
});

describe("Preferencia de avisos de nueva versión", () => {
  let app: Express;

  beforeEach(async () => {
    const db = await createPgliteDb();
    app = createApp(db);
  });

  async function register(email: string, username: string): Promise<string> {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, username, password: "supersecret", accepted_terms: true, confirmed_age: true });
    return res.body.token as string;
  }

  it("empieza activada por defecto y se puede desactivar", async () => {
    const token = await register("ana@example.com", "ana");

    const initial = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(initial.body.release_notifications_enabled).toBe(true);

    const update = await request(app)
      .patch("/api/auth/notification-preferences")
      .set("Authorization", `Bearer ${token}`)
      .send({ release_notifications_enabled: false });
    expect(update.status).toBe(200);

    const after = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(after.body.release_notifications_enabled).toBe(false);
  });

  it("exige sesión para /me y para cambiar la preferencia", async () => {
    const me = await request(app).get("/api/auth/me");
    expect(me.status).toBe(401);

    const patch = await request(app)
      .patch("/api/auth/notification-preferences")
      .send({ release_notifications_enabled: false });
    expect(patch.status).toBe(401);
  });
});
