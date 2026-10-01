import { join } from "node:path";
import { createPgDb } from "./pg";
import { createPgliteDb } from "./pglite";
import type { Db } from "./types";

export type { Db } from "./types";

export async function createDb(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    // DATABASE_MIGRATION_URL es opcional (ver pg.ts): permite que
    // DATABASE_URL sea un rol de Postgres restringido, con un rol aparte y
    // más privilegiado solo para aplicar schema.sql al arrancar.
    return await createPgDb(process.env.DATABASE_URL, process.env.DATABASE_MIGRATION_URL);
  }

  console.warn(
    "DATABASE_URL no está definida: usando PGlite (Postgres embebido) en ./.pgdata para desarrollo local."
  );
  return createPgliteDb(join(__dirname, "..", "..", ".pgdata"));
}
