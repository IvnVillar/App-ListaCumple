import { randomUUID } from "node:crypto";
import type { Db } from "../db";
import type { FriendshipRow, ListRow } from "../domain/types";
import { normalizeListRow } from "../domain/normalizeListRow";
import { isUniqueViolation } from "../db/pgErrors";

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class InvalidOperationError extends Error {}
export class ForbiddenError extends Error {}

export interface FriendSummary {
  friendship_id: string;
  user_id: string;
  username: string;
}

export interface FriendRequestSummary {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
}

async function findExistingRelationship(
  db: Db,
  userIdA: string,
  userIdB: string
): Promise<FriendshipRow | null> {
  const result = await db.query<FriendshipRow>(
    `SELECT * FROM friendships
     WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
    [userIdA, userIdB]
  );
  return result.rows[0] ?? null;
}

/**
 * Si la otra persona ya nos había enviado una solicitud, pedirle amistad
 * nosotros equivale a aceptar la suya en vez de crear una segunda fila (el
 * índice único por pareja tampoco lo permitiría). Si fuimos nosotros los
 * que ya la enviamos, o ya sois amigos, se informa en vez de duplicar.
 */
async function resolveExistingRelationship(
  db: Db,
  requesterId: string,
  targetId: string
): Promise<{ status: "accepted"; friendship: FriendshipRow }> {
  const row = await findExistingRelationship(db, requesterId, targetId);
  if (!row) {
    throw new Error("No se pudo resolver la relación de amistad tras el choque de escritura");
  }
  if (row.status === "accepted") {
    throw new ConflictError("Ya sois amigos");
  }
  if (row.requester_id === requesterId) {
    throw new ConflictError("Ya le has enviado una solicitud a esta persona");
  }
  const accepted = await db.query<FriendshipRow>(
    "UPDATE friendships SET status = 'accepted', responded_at = now() WHERE id = $1 RETURNING *",
    [row.id]
  );
  return { status: "accepted", friendship: accepted.rows[0] };
}

export async function sendFriendRequest(
  db: Db,
  requesterId: string,
  targetUsername: string
): Promise<{ status: "pending" | "accepted"; friendship: FriendshipRow }> {
  const target = await db.query<{ id: string }>("SELECT id FROM users WHERE username = $1", [targetUsername]);
  const targetUser = target.rows[0];
  if (!targetUser) throw new NotFoundError("No hay ninguna cuenta con ese usuario");
  if (targetUser.id === requesterId) throw new InvalidOperationError("No puedes añadirte a ti mismo");

  try {
    const result = await db.query<FriendshipRow>(
      `INSERT INTO friendships (id, requester_id, addressee_id, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [randomUUID(), requesterId, targetUser.id]
    );
    return { status: "pending", friendship: result.rows[0] };
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    return resolveExistingRelationship(db, requesterId, targetUser.id);
  }
}

export async function listFriends(db: Db, userId: string): Promise<FriendSummary[]> {
  const result = await db.query<FriendSummary>(
    `SELECT f.id AS friendship_id, u.id AS user_id, u.username
     FROM friendships f
     JOIN users u ON u.id = (CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END)
     WHERE f.status = 'accepted' AND (f.requester_id = $1 OR f.addressee_id = $1)
     ORDER BY u.username ASC`,
    [userId]
  );
  return result.rows;
}

export async function listPendingRequests(
  db: Db,
  userId: string
): Promise<{ incoming: FriendRequestSummary[]; outgoing: FriendRequestSummary[] }> {
  const incoming = await db.query<FriendRequestSummary>(
    `SELECT f.id, u.id AS user_id, u.username, f.created_at
     FROM friendships f
     JOIN users u ON u.id = f.requester_id
     WHERE f.addressee_id = $1 AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  const outgoing = await db.query<FriendRequestSummary>(
    `SELECT f.id, u.id AS user_id, u.username, f.created_at
     FROM friendships f
     JOIN users u ON u.id = f.addressee_id
     WHERE f.requester_id = $1 AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return { incoming: incoming.rows, outgoing: outgoing.rows };
}

export async function acceptFriendRequest(db: Db, userId: string, requestId: string): Promise<FriendshipRow> {
  const result = await db.query<FriendshipRow>(
    `UPDATE friendships SET status = 'accepted', responded_at = now()
     WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
     RETURNING *`,
    [requestId, userId]
  );
  const row = result.rows[0];
  if (!row) throw new NotFoundError("Solicitud no encontrada");
  return row;
}

// Cubre tanto rechazar una solicitud recibida como cancelar una enviada:
// cualquiera de los dos lados de una solicitud pendiente puede borrarla.
export async function removePendingRequest(db: Db, userId: string, requestId: string): Promise<void> {
  const result = await db.query(
    `DELETE FROM friendships
     WHERE id = $1 AND status = 'pending' AND (requester_id = $2 OR addressee_id = $2)
     RETURNING id`,
    [requestId, userId]
  );
  if (result.rows.length === 0) throw new NotFoundError("Solicitud no encontrada");
}

export async function removeFriendship(db: Db, userId: string, friendshipId: string): Promise<void> {
  const result = await db.query(
    `DELETE FROM friendships
     WHERE id = $1 AND status = 'accepted' AND (requester_id = $2 OR addressee_id = $2)
     RETURNING id`,
    [friendshipId, userId]
  );
  if (result.rows.length === 0) throw new NotFoundError("Amistad no encontrada");
}

/**
 * Ver las listas de un amigo reutiliza el mismo modelo de privacidad que un
 * visitante con enlace (spec sección 4 y 7): esta función solo devuelve las
 * filas de `lists`, incluido su share_token, para que el detalle de cada una
 * se pida con el endpoint de visitante ya existente en vez de duplicar lógica.
 */
export async function getFriendLists(db: Db, userId: string, friendUserId: string): Promise<ListRow[]> {
  const relationship = await db.query<{ status: string }>(
    `SELECT status FROM friendships
     WHERE status = 'accepted' AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
    [userId, friendUserId]
  );
  if (!relationship.rows[0]) throw new ForbiddenError("No sois amigos");

  const result = await db.query<ListRow>("SELECT * FROM lists WHERE owner_id = $1 ORDER BY created_at DESC", [
    friendUserId,
  ]);
  return result.rows.map(normalizeListRow);
}
