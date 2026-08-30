import type { Express } from "express";
import { createApp } from "../app";
import { createPgliteDb } from "../db/pglite";

export async function buildTestApp(): Promise<Express> {
  const db = await createPgliteDb();
  return createApp(db);
}
