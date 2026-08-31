import { randomUUID } from "node:crypto";
import type { Db } from "../db";
import type { ItemRow, ListRow } from "../domain/types";
import { normalizeListRow } from "../domain/normalizeListRow";

export class ConflictError extends Error {}
export class NotFoundError extends Error {}
export class ExpiredError extends Error {}
export class InvalidOperationError extends Error {}

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === UNIQUE_VIOLATION;
}

interface VisitorItemRow extends ItemRow {
  reserver_alias: string | null;
  total_contributed: string | null;
}

export interface VisitorItemView {
  id: string;
  title: string;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  source_url: string | null;
  store_name: string | null;
  notes: string | null;
  is_group_gift: boolean;
  status: "available" | "reserved";
  reserver_alias: string | null;
  group_gift: { total_contributed: number; remaining: number | null } | null;
}

function toItemView(row: VisitorItemRow): VisitorItemView {
  const price = row.price != null ? Number(row.price) : null;
  const totalContributed = row.total_contributed != null ? Number(row.total_contributed) : 0;
  const isReserved = row.reserver_alias != null;

  return {
    id: row.id,
    title: row.title,
    image_url: row.image_url,
    price,
    currency: row.currency,
    source_url: row.source_url,
    store_name: row.store_name,
    notes: row.notes,
    is_group_gift: row.is_group_gift,
    status: isReserved ? "reserved" : "available",
    reserver_alias: !row.is_group_gift ? row.reserver_alias : null,
    group_gift: row.is_group_gift
      ? {
          total_contributed: totalContributed,
          remaining: price != null ? Math.max(price - totalContributed, 0) : null,
        }
      : null,
  };
}

async function assertListActive(db: Db, shareToken: string): Promise<ListRow> {
  const result = await db.query<ListRow>("SELECT * FROM lists WHERE share_token = $1", [shareToken]);
  const list = result.rows[0];
  if (!list) throw new NotFoundError("Lista no encontrada");
  if (list.expires_at && new Date(list.expires_at).getTime() < Date.now()) {
    throw new ExpiredError("Este enlace ha caducado");
  }
  return normalizeListRow(list);
}

export async function getListForVisitor(
  db: Db,
  shareToken: string
): Promise<{ list: ListRow; items: VisitorItemView[] }> {
  const list = await assertListActive(db, shareToken);

  const result = await db.query<VisitorItemRow>(
    `SELECT items.*,
            reservations.reserver_alias,
            (SELECT COALESCE(SUM(c.amount), 0) FROM contributions c WHERE c.reservation_id = reservations.id)
              AS total_contributed
     FROM items
     LEFT JOIN reservations ON reservations.item_id = items.id
     WHERE items.list_id = $1
     ORDER BY items.created_at ASC`,
    [list.id]
  );

  return { list, items: result.rows.map(toItemView) };
}

export async function reserveItem(
  db: Db,
  shareToken: string,
  itemId: string,
  alias: string
): Promise<void> {
  const list = await assertListActive(db, shareToken);

  const itemResult = await db.query<ItemRow>("SELECT * FROM items WHERE id = $1 AND list_id = $2", [
    itemId,
    list.id,
  ]);
  const item = itemResult.rows[0];
  if (!item) throw new NotFoundError("Artículo no encontrado");
  if (item.is_group_gift) {
    throw new InvalidOperationError("Este artículo es un bote común: usa la aportación en su lugar");
  }

  try {
    await db.query("INSERT INTO reservations (id, item_id, reserver_alias) VALUES ($1, $2, $3)", [
      randomUUID(),
      itemId,
      alias,
    ]);
  } catch (err) {
    if (isUniqueViolation(err)) throw new ConflictError("Este artículo ya tiene destino");
    throw err;
  }
}

export async function contributeToItem(
  db: Db,
  shareToken: string,
  itemId: string,
  alias: string,
  amount: number
): Promise<void> {
  const list = await assertListActive(db, shareToken);

  const itemResult = await db.query<ItemRow>("SELECT * FROM items WHERE id = $1 AND list_id = $2", [
    itemId,
    list.id,
  ]);
  const item = itemResult.rows[0];
  if (!item) throw new NotFoundError("Artículo no encontrado");
  if (!item.is_group_gift) {
    throw new InvalidOperationError("Este artículo no es un bote común: usa la reserva en su lugar");
  }

  const existingReservation = await db.query<{ id: string }>(
    "SELECT id FROM reservations WHERE item_id = $1",
    [itemId]
  );

  let reservationId = existingReservation.rows[0]?.id;
  if (!reservationId) {
    reservationId = randomUUID();
    try {
      await db.query("INSERT INTO reservations (id, item_id, reserver_alias) VALUES ($1, $2, $3)", [
        reservationId,
        itemId,
        alias,
      ]);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Carrera con otro contribuyente creando la misma reserva: usar la que ya exista.
      const retry = await db.query<{ id: string }>("SELECT id FROM reservations WHERE item_id = $1", [
        itemId,
      ]);
      reservationId = retry.rows[0]?.id;
      if (!reservationId) throw new ConflictError("No se pudo registrar la aportación");
    }
  }

  await db.query(
    "INSERT INTO contributions (id, item_id, reservation_id, contributor_alias, amount) VALUES ($1, $2, $3, $4, $5)",
    [randomUUID(), itemId, reservationId, alias, amount]
  );
}
