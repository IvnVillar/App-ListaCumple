import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "./testApp";

async function registerAndGetToken(app: Express, email: string): Promise<string> {
  const username = email.split("@")[0];
  const res = await request(app).post("/api/auth/register").send({ email, username, password: "supersecret" });
  return res.body.token;
}

describe("Amigos", () => {
  let app: Express;
  let anaToken: string;
  let beaToken: string;

  beforeEach(async () => {
    app = await buildTestApp();
    anaToken = await registerAndGetToken(app, "ana@example.com");
    beaToken = await registerAndGetToken(app, "bea@example.com");
  });

  it("envía una solicitud pendiente que aparece como entrante para el destinatario", async () => {
    const send = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "bea" });
    expect(send.status).toBe(201);
    expect(send.body.status).toBe("pending");

    const beaRequests = await request(app)
      .get("/api/friends/requests")
      .set("Authorization", `Bearer ${beaToken}`);
    expect(beaRequests.body.incoming).toHaveLength(1);
    expect(beaRequests.body.incoming[0].username).toBe("ana");

    const anaRequests = await request(app)
      .get("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`);
    expect(anaRequests.body.outgoing).toHaveLength(1);
    expect(anaRequests.body.outgoing[0].username).toBe("bea");
  });

  it("no permite enviarse una solicitud a uno mismo", async () => {
    const res = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "ana" });
    expect(res.status).toBe(400);
  });

  it("devuelve 404 si el usuario no corresponde a ninguna cuenta", async () => {
    const res = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "nadie" });
    expect(res.status).toBe(404);
  });

  it("aceptar una solicitud los convierte en amigos para ambos", async () => {
    const send = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "bea" });
    const requestId = send.body.friendship.id;

    const accept = await request(app)
      .post(`/api/friends/requests/${requestId}/accept`)
      .set("Authorization", `Bearer ${beaToken}`);
    expect(accept.status).toBe(200);
    expect(accept.body.status).toBe("accepted");

    const anaFriends = await request(app).get("/api/friends").set("Authorization", `Bearer ${anaToken}`);
    expect(anaFriends.body).toHaveLength(1);
    expect(anaFriends.body[0].username).toBe("bea");

    const beaFriends = await request(app).get("/api/friends").set("Authorization", `Bearer ${beaToken}`);
    expect(beaFriends.body).toHaveLength(1);
    expect(beaFriends.body[0].username).toBe("ana");
  });

  it("solo el destinatario puede aceptar, no quien la envió", async () => {
    const send = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "bea" });
    const requestId = send.body.friendship.id;

    const acceptByRequester = await request(app)
      .post(`/api/friends/requests/${requestId}/accept`)
      .set("Authorization", `Bearer ${anaToken}`);
    expect(acceptByRequester.status).toBe(404);
  });

  it("si dos personas se piden amistad mutuamente, la segunda petición acepta la primera en vez de duplicarla", async () => {
    await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "bea" });

    const second = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${beaToken}`)
      .send({ username: "ana" });

    expect(second.status).toBe(201);
    expect(second.body.status).toBe("accepted");

    const anaFriends = await request(app).get("/api/friends").set("Authorization", `Bearer ${anaToken}`);
    expect(anaFriends.body).toHaveLength(1);
  });

  it("no deja enviar dos solicitudes a la misma persona, ni pedir amistad si ya sois amigos", async () => {
    const send = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "bea" });

    const duplicate = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "bea" });
    expect(duplicate.status).toBe(409);

    await request(app)
      .post(`/api/friends/requests/${send.body.friendship.id}/accept`)
      .set("Authorization", `Bearer ${beaToken}`);

    const afterAccepted = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "bea" });
    expect(afterAccepted.status).toBe(409);
  });

  it("rechazar una solicitud la borra sin crear amistad", async () => {
    const send = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "bea" });

    const reject = await request(app)
      .delete(`/api/friends/requests/${send.body.friendship.id}`)
      .set("Authorization", `Bearer ${beaToken}`);
    expect(reject.status).toBe(204);

    const beaFriends = await request(app).get("/api/friends").set("Authorization", `Bearer ${beaToken}`);
    expect(beaFriends.body).toHaveLength(0);

    // Al haberse borrado, puede volver a pedirse amistad sin chocar con nada.
    const retry = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "bea" });
    expect(retry.status).toBe(201);
  });

  it("deshace la amistad y ambos dejan de verse en /api/friends", async () => {
    const send = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "bea" });
    const friendshipId = send.body.friendship.id;
    await request(app)
      .post(`/api/friends/requests/${friendshipId}/accept`)
      .set("Authorization", `Bearer ${beaToken}`);

    const remove = await request(app)
      .delete(`/api/friends/${friendshipId}`)
      .set("Authorization", `Bearer ${anaToken}`);
    expect(remove.status).toBe(204);

    const anaFriends = await request(app).get("/api/friends").set("Authorization", `Bearer ${anaToken}`);
    expect(anaFriends.body).toHaveLength(0);
    const beaFriends = await request(app).get("/api/friends").set("Authorization", `Bearer ${beaToken}`);
    expect(beaFriends.body).toHaveLength(0);
  });

  it("solo deja ver las listas de un amigo aceptado, no de un desconocido", async () => {
    const list = await request(app)
      .post("/api/lists")
      .set("Authorization", `Bearer ${beaToken}`)
      .send({ title: "Cumple de Bea", occasion_type: "cumpleanos" });
    expect(list.status).toBe(201);

    const send = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", `Bearer ${anaToken}`)
      .send({ username: "bea" });
    const beaId = send.body.friendship.addressee_id;

    const beforeAccept = await request(app)
      .get(`/api/friends/${beaId}/lists`)
      .set("Authorization", `Bearer ${anaToken}`);
    expect(beforeAccept.status).toBe(403);

    await request(app)
      .post(`/api/friends/requests/${send.body.friendship.id}/accept`)
      .set("Authorization", `Bearer ${beaToken}`);

    const afterAccept = await request(app)
      .get(`/api/friends/${beaId}/lists`)
      .set("Authorization", `Bearer ${anaToken}`);
    expect(afterAccept.status).toBe(200);
    expect(afterAccept.body).toHaveLength(1);
    expect(afterAccept.body[0].title).toBe("Cumple de Bea");
    expect(afterAccept.body[0].share_token).toBeTruthy();
  });
});
