import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import type { Db } from "../db";
import { createPgliteDb } from "../db/pglite";
import type { Mailer } from "../mail/mailer";

describe("Recuperación de contraseña", () => {
  let app: Express;
  let db: Db;
  let sentEmails: { to: string; resetUrl: string }[];

  beforeEach(async () => {
    sentEmails = [];
    const stubMailer: Mailer = async (to, resetUrl) => {
      sentEmails.push({ to, resetUrl });
    };
    db = await createPgliteDb();
    app = createApp(db, undefined, undefined, stubMailer);
  });

  async function register(email: string, username: string, password = "supersecret"): Promise<string> {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, username, password, accepted_terms: true, confirmed_age: true });
    return res.body.token as string;
  }

  function extractToken(resetUrl: string): string {
    return new URL(resetUrl).searchParams.get("token")!;
  }

  it("responde con el mismo mensaje genérico exista o no la cuenta, y solo manda email si existe (anti-enumeración)", async () => {
    await register("ana@example.com", "ana");

    const existing = await request(app).post("/api/auth/forgot-password").send({ email: "ana@example.com" });
    expect(existing.status).toBe(200);

    const missing = await request(app).post("/api/auth/forgot-password").send({ email: "nadie@example.com" });
    expect(missing.status).toBe(200);
    expect(missing.body.message).toBe(existing.body.message);

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe("ana@example.com");
  });

  it("permite elegir una contraseña nueva con el enlace recibido", async () => {
    await register("ana@example.com", "ana");
    await request(app).post("/api/auth/forgot-password").send({ email: "ana@example.com" });
    const token = extractToken(sentEmails[0].resetUrl);

    const reset = await request(app).post("/api/auth/reset-password").send({ token, password: "nuevasecreta123" });
    expect(reset.status).toBe(200);

    const oldPasswordLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@example.com", password: "supersecret" });
    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@example.com", password: "nuevasecreta123" });
    expect(newPasswordLogin.status).toBe(200);
  });

  it("invalida las sesiones ya abiertas al restablecer la contraseña", async () => {
    const oldToken = await register("ana@example.com", "ana");
    await request(app).post("/api/auth/forgot-password").send({ email: "ana@example.com" });
    const resetToken = extractToken(sentEmails[0].resetUrl);
    await request(app).post("/api/auth/reset-password").send({ token: resetToken, password: "nuevasecreta123" });

    const withOldToken = await request(app).delete("/api/auth/account").set("Authorization", `Bearer ${oldToken}`);
    expect(withOldToken.status).toBe(401);
  });

  it("rechaza un token inventado, y uno ya usado no sirve una segunda vez", async () => {
    const bogus = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "esto-no-es-un-token-real", password: "nuevasecreta123" });
    expect(bogus.status).toBe(400);

    await register("bea@example.com", "bea");
    await request(app).post("/api/auth/forgot-password").send({ email: "bea@example.com" });
    const token = extractToken(sentEmails[0].resetUrl);
    await request(app).post("/api/auth/reset-password").send({ token, password: "primeracambio1" });

    const reuse = await request(app).post("/api/auth/reset-password").send({ token, password: "segundocambio2" });
    expect(reuse.status).toBe(400);
  });

  it("rechaza un token caducado", async () => {
    await register("caduca@example.com", "caduca");
    await request(app).post("/api/auth/forgot-password").send({ email: "caduca@example.com" });
    const token = extractToken(sentEmails[0].resetUrl);

    await db.query("UPDATE users SET password_reset_expires_at = now() - interval '1 minute' WHERE email = $1", [
      "caduca@example.com",
    ]);

    const expired = await request(app).post("/api/auth/reset-password").send({ token, password: "nuevasecreta123" });
    expect(expired.status).toBe(400);
  });

  it("limita las peticiones de recuperación de contraseña", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 6 }, () =>
        request(app).post("/api/auth/forgot-password").send({ email: "spam@example.com" })
      )
    );
    expect(attempts.some((res) => res.status === 429)).toBe(true);
  });
});
