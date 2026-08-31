import { Pool } from "pg";
import type { Db } from "./types";

export function createPgDb(connectionString: string): Db {
  const pool = new Pool({ connectionString });

  // node-postgres emits 'error' on the pool when an IDLE client hits a
  // problem (connection dropped by the server, network blip...) unrelated
  // to any in-flight query. EventEmitter throws and crashes the process on
  // an 'error' event with no listener, so this is required, not optional.
  pool.on("error", (err) => {
    console.error("Error inesperado en un cliente inactivo del pool de Postgres:", err);
  });

  return {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
      const result = await pool.query(text, params);
      return { rows: result.rows as T[] };
    },
  };
}
