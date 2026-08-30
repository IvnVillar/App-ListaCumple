import { randomUUID } from "node:crypto";
import type { Db } from "../db";
import type { ListRow, OwnerItemRow, OccasionType } from "../domain/types";
import type { ExtractedMetadata } from "../types";

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

export interface ManualItemFields {
  title?: string;
  image_url?: string | null;
  price?: number | null;
  currency?: string | null;
  source_url?: string | null;
  store_name?: string | null;
  notes?: string | null;
  is_group_gift?: boolean;
}

/**
 * Los datos extraídos vienen de HTML de terceros y no pasan por la
 * validación de los campos manuales (zod, en la ruta) — se sanean aparte
 * antes de fusionarse, para no guardar p.ej. una "moneda" de 8 caracteres
 * o un precio negativo que un JSON-LD mal formado pudiera colar.
 */
export function sanitizeExtractedMetadata(extracted: ExtractedMetadata | null): ExtractedMetadata | null {
  if (!extracted) return null;
  const price =
    extracted.price != null && Number.isFinite(extracted.price) && extracted.price >= 0
      ? extracted.price
      : null;
  const currency =
    extracted.currency && /^[A-Za-z]{3}$/.test(extracted.currency) ? extracted.currency.toUpperCase() : null;
  const store_name = extracted.store_name ? extracted.store_name.slice(0, 120) : null;
  return { ...extracted, price, currency, store_name };
}

export type ResolvedItemFields = { ok: true; input: CreateItemInput } | { ok: false; reason: "missing_title" };

/**
 * Combina lo escrito a mano con lo extraído de una URL: cualquier campo
 * enviado explícitamente en la petición gana sobre el extraído, así el
 * cliente puede pegar un link y corregir campos en la misma llamada sin
 * perder lo ya escrito (spec 5.2/7: la extracción nunca debe bloquear ni
 * imponerse sobre una corrección manual).
 */
export function resolveItemFields(
  manual: ManualItemFields,
  extracted: ExtractedMetadata | null
): ResolvedItemFields {
  const title = manual.title ?? extracted?.title ?? null;
  if (!title) return { ok: false, reason: "missing_title" };

  return {
    ok: true,
    input: {
      title,
      imageUrl: manual.image_url !== undefined ? manual.image_url : (extracted?.image_url ?? null),
      price: manual.price !== undefined ? manual.price : (extracted?.price ?? null),
      currency: manual.currency !== undefined ? manual.currency : (extracted?.currency ?? null),
      sourceUrl: manual.source_url ?? null,
      storeName: manual.store_name !== undefined ? manual.store_name : (extracted?.store_name ?? null),
      notes: manual.notes,
      isGroupGift: manual.is_group_gift,
    },
  };
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
