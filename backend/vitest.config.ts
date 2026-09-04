import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Cada test que toca la BD arranca su propio PGlite (Postgres real en
    // WASM) desde cero; bajo carga eso puede tardar más que el timeout por
    // defecto de vitest (5s), sin que sea un fallo real del código. El
    // arranque de PGlite ocurre en beforeEach, así que hookTimeout necesita
    // el mismo margen que testTimeout, no solo este último.
    testTimeout: 20000,
    hookTimeout: 20000,
    // Cada archivo de test arranca su propio PGlite — en paralelo (el modo
    // por defecto) varios a la vez saturan la máquina y provocan timeouts
    // que no son un fallo real del código (lo confirmamos: en secuencial,
    // 115/115 pasan siempre). El conjunto es pequeño, así que perder algo
    // de velocidad a cambio de que no sea intermitente merece la pena.
    fileParallelism: false,
  },
});
