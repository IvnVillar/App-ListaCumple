// Los usuarios suelen pegar URLs sin esquema ("www.tienda.com/producto" o
// "tienda.com/producto"). new URL() y z.string().url() las rechazan porque
// exigen un esquema explícito; anteponer "https://" cuando falta cubre el
// caso real sin inventar heurísticas más complejas.
const HAS_SCHEME = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (HAS_SCHEME.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
