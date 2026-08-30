import { join } from "node:path";
import { createPgDb } from "./pg";
import { createPgliteDb } from "./pglite";
import type { Db } from "./types";

export type { Db } from "./types";

export async function createDb(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    return createPgDb(process.env.DATABASE_URL);
  }

  console.warn(
    "DATABASE_URL no está definida: usando PGlite (Postgres embebido) en ./.pgdata para desarrollo local."
  );
  return createPgliteDb(join(__dirname, "..", "..", ".pgdata"));
}
