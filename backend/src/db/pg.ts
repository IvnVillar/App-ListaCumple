import { Pool } from "pg";
import type { Db } from "./types";

export function createPgDb(connectionString: string): Db {
  const pool = new Pool({ connectionString });

  return {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
      const result = await pool.query(text, params);
      return { rows: result.rows as T[] };
    },
  };
}
