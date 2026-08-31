import type { Db } from "../db";
import { assertAreFriends } from "./friends";

export interface GiftSuggestion {
  title: string;
  reason: string;
}

export interface SavedItemSignal {
  title: string;
  store_name: string | null;
  notes: string | null;
}

// Inyectable para poder testear la lógica de permisos y de reunir señales sin
// depender de una API de IA real (mismo patrón que MetadataExtractor).
export type Suggester = (items: SavedItemSignal[]) => Promise<GiftSuggestion[]>;

/**
 * Sugerencias de regalo para un amigo (spec de IA "onsite"): se basa en lo
 * que ESE amigo ya tiene guardado, nunca en lo tuyo — es él quien recibe el
 * regalo. Solo se ofrece a amigos aceptados, igual que ver sus listas.
 */
export async function suggestGiftsForFriend(
  db: Db,
  suggester: Suggester,
  viewerId: string,
  friendUserId: string
): Promise<GiftSuggestion[]> {
  await assertAreFriends(db, viewerId, friendUserId);

  const result = await db.query<SavedItemSignal>(
    `SELECT items.title, items.store_name, items.notes
     FROM items
     JOIN lists ON lists.id = items.list_id
     WHERE lists.owner_id = $1
     ORDER BY items.created_at DESC
     LIMIT 30`,
    [friendUserId]
  );
  if (result.rows.length === 0) return [];

  try {
    return await suggester(result.rows);
  } catch {
    // Un fallo de la IA (red, cuota, respuesta rara) no debe tumbar la
    // pantalla de un amigo — sencillamente no hay sugerencias por ahora.
    return [];
  }
}
