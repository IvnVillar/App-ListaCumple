import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Cada test que toca la BD arranca su propio PGlite (Postgres real en
    // WASM) desde cero; bajo carga eso puede tardar más que el timeout por
    // defecto de vitest (5s), sin que sea un fallo real del código.
    testTimeout: 20000,
  },
});
