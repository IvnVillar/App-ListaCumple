import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import type { Db } from "./types";

const SCHEMA_PATH = join(__dirname, "schema.sql");

/**
 * `migrationConnectionString`, si se da, es una conexión aparte SOLO para
 * aplicar schema.sql (crear/alterar tablas) con un rol con privilegios de
 * esquema; la conexión de verdad que atiende peticiones (`connectionString`)
 * puede entonces ser un rol restringido (solo SELECT/INSERT/UPDATE/DELETE),
 * así que si la app llega a verse comprometida, lo máximo que puede hacer
 * contra la base de datos es leer o escribir filas — nunca borrar tablas,
 * crear roles ni tocar el esquema (checklist de producción: "restrict
 * database permissions"). Si no se da, se mantiene el comportamiento de
 * siempre: una única conexión hace ambas cosas.
 */
export async function createPgDb(connectionString: string, migrationConnectionString?: string): Promise<Db> {
  // El equivalente PGlite (dev local) aplica schema.sql al arrancar; sin
  // hacer lo mismo aquí, la primera consulta real contra Postgres fallaría
  // con "relation does not exist" porque nunca se creó ninguna tabla. Usa
  // CREATE TABLE/INDEX IF NOT EXISTS, así que reaplicarlo en cada arranque
  // es idempotente y seguro también contra una base ya inicializada.
  const schema = readFileSync(SCHEMA_PATH, "utf-8");

  if (migrationConnectionString) {
    const migrationPool = new Pool({ connectionString: migrationConnectionString });
    await migrationPool.query(schema);
    await migrationPool.end();
  }

  const pool = new Pool({ connectionString });

  // node-postgres emits 'error' on the pool when an IDLE client hits a
  // problem (connection dropped by the server, network blip...) unrelated
  // to any in-flight query. EventEmitter throws and crashes the process on
  // an 'error' event with no listener, so this is required, not optional.
  pool.on("error", (err) => {
    console.error("Error inesperado en un cliente inactivo del pool de Postgres:", err);
  });

  if (!migrationConnectionString) {
    await pool.query(schema);
  }

  return {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
      const result = await pool.query(text, params);
      return { rows: result.rows as T[] };
    },
  };
}
