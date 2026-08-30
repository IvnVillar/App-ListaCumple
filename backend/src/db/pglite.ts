import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./types";

const SCHEMA_PATH = join(__dirname, "schema.sql");

export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  await client.waitReady;

  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  await client.exec(schema);

  return {
    async query<T>(text: string, params: unknown[] = []) {
      const result = await client.query<T>(text, params);
      return { rows: result.rows };
    },
  };
}
