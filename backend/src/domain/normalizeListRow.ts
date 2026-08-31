import type { ListRow } from "./types";

/**
 * node-postgres (y PGlite, verificado igual) devuelven una columna DATE
 * como objeto Date de JS, no como el "AAAA-MM-DD" que se guardó — al
 * pasar por res.json() eso serializa como timestamp completo en UTC
 * ("2026-12-24T00:00:00.000Z"), rompiendo el formato que el cliente envió
 * y espera de vuelta. `expires_at` es TIMESTAMPTZ y sí debe quedarse como
 * timestamp completo; sólo `event_date` (DATE) necesita esta normalización.
 */
export function normalizeListRow<T extends ListRow>(row: T): T {
  const eventDate = row.event_date as unknown;
  if (!(eventDate instanceof Date)) return row;
  return { ...row, event_date: eventDate.toISOString().slice(0, 10) };
}
