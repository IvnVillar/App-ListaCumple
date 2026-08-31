/**
 * `new Date("2026-08-01")` parsea la fecha como medianoche UTC; al formatear
 * con la zona horaria local de un dispositivo con offset negativo, mostraría
 * el día anterior. Se construye con componentes locales para evitarlo.
 */
export function formatEventDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}
