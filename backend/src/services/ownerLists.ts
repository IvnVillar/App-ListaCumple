import { randomUUID } from "node:crypto";
import type { Db } from "../db";
import type { ListRow, OwnerItemRow, OccasionType } from "../domain/types";

export interface CreateListInput {
  title: string;
  occasionType: OccasionType;
  eventDate?: string | null;
  expiresAt?: string | null;
}

export interface CreateItemInput {
  title: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  sourceUrl?: string | null;
  storeName?: string | null;
  notes?: string | null;
  isGroupGift?: boolean;
}

export async function createList(db: Db, ownerId: string, input: CreateListInput): Promise<ListRow> {
  const id = randomUUID();
  const shareToken = randomUUID();
  const result = await db.query<ListRow>(
    `INSERT INTO lists (id, owner_id, title, occasion_type, event_date, expires_at, share_token)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, ownerId, input.title, input.occasionType, input.eventDate ?? null, input.expiresAt ?? null, shareToken]
  );
  return result.rows[0];
}

export async function listListsForOwner(db: Db, ownerId: string): Promise<ListRow[]> {
  const result = await db.query<ListRow>(
    "SELECT * FROM lists WHERE owner_id = $1 ORDER BY created_at DESC",
    [ownerId]
  );
  return result.rows;
}

export async function getListForOwner(db: Db, ownerId: string, listId: string): Promise<ListRow | null> {
  const result = await db.query<ListRow>("SELECT * FROM lists WHERE id = $1 AND owner_id = $2", [
    listId,
    ownerId,
  ]);
  return result.rows[0] ?? null;
}

export async function deleteList(db: Db, ownerId: string, listId: string): Promise<boolean> {
  const result = await db.query("DELETE FROM lists WHERE id = $1 AND owner_id = $2 RETURNING id", [
    listId,
    ownerId,
  ]);
  return result.rows.length > 0;
}

/**
 * Items de una lista vistos por su dueño. Sólo expone `has_destination`
 * (vía EXISTS); nunca selecciona alias ni importes de reservations/contributions,
 * porque el dueño no debe poder verlos bajo ninguna circunstancia (spec sección 4 y 7).
 */
export async function getItemsForOwner(db: Db, listId: string): Promise<OwnerItemRow[]> {
  const result = await db.query<OwnerItemRow>(
    `SELECT items.*,
            EXISTS (SELECT 1 FROM reservations r WHERE r.item_id = items.id) AS has_destination
     FROM items
     WHERE items.list_id = $1
     ORDER BY items.created_at ASC`,
    [listId]
  );
  return result.rows;
}

export async function addItem(db: Db, listId: string, input: CreateItemInput): Promise<OwnerItemRow> {
  const id = randomUUID();
  const result = await db.query<OwnerItemRow>(
    `INSERT INTO items (id, list_id, title, image_url, price, currency, source_url, store_name, notes, is_group_gift)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *, false AS has_destination`,
    [
      id,
      listId,
      input.title,
      input.imageUrl ?? null,
      input.price ?? null,
      input.currency ?? null,
      input.sourceUrl ?? null,
      input.storeName ?? null,
      input.notes ?? null,
      input.isGroupGift ?? false,
    ]
  );
  return result.rows[0];
}

export async function getItemForOwner(db: Db, listId: string, itemId: string): Promise<OwnerItemRow | null> {
  const result = await db.query<OwnerItemRow>(
    `SELECT items.*,
            EXISTS (SELECT 1 FROM reservations r WHERE r.item_id = items.id) AS has_destination
     FROM items
     WHERE items.id = $1 AND items.list_id = $2`,
    [itemId, listId]
  );
  return result.rows[0] ?? null;
}

export interface UpdateItemInput {
  title?: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  sourceUrl?: string | null;
  storeName?: string | null;
  notes?: string | null;
  isGroupGift?: boolean;
}

export async function updateItem(
  db: Db,
  listId: string,
  itemId: string,
  input: UpdateItemInput
): Promise<OwnerItemRow | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const columns: Record<string, keyof UpdateItemInput> = {
    title: "title",
    image_url: "imageUrl",
    price: "price",
    currency: "currency",
    source_url: "sourceUrl",
    store_name: "storeName",
    notes: "notes",
    is_group_gift: "isGroupGift",
  };

  for (const [column, key] of Object.entries(columns)) {
    if (key in input) {
      fields.push(`${column} = $${paramIndex}`);
      values.push(input[key]);
      paramIndex += 1;
    }
  }

  if (fields.length === 0) {
    return getItemForOwner(db, listId, itemId);
  }

  values.push(itemId, listId);
  const result = await db.query<OwnerItemRow>(
    `UPDATE items SET ${fields.join(", ")}
     WHERE id = $${paramIndex} AND list_id = $${paramIndex + 1}
     RETURNING *, EXISTS (SELECT 1 FROM reservations r WHERE r.item_id = items.id) AS has_destination`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteItem(db: Db, listId: string, itemId: string): Promise<boolean> {
  const result = await db.query("DELETE FROM items WHERE id = $1 AND list_id = $2 RETURNING id", [
    itemId,
    listId,
  ]);
  return result.rows.length > 0;
}
