import { describe, expect, it } from "vitest";
import { TtlCache } from "../cache";

describe("TtlCache", () => {
  it("devuelve lo guardado mientras no haya expirado", () => {
    const cache = new TtlCache<string>();
    cache.set("a", "valor-a");
    expect(cache.get("a")).toBe("valor-a");
  });

  it("no crece sin límite: al superar el tope, descarta la entrada más antigua", () => {
    const cache = new TtlCache<number>();
    const MAX_ENTRIES = 5000;

    for (let i = 0; i < MAX_ENTRIES; i++) {
      cache.set(`key-${i}`, i);
    }
    expect(cache.get("key-0")).toBe(0);

    // Una entrada más debería expulsar a la más antigua (key-0).
    cache.set("key-nueva", -1);
    expect(cache.get("key-0")).toBeUndefined();
    expect(cache.get("key-nueva")).toBe(-1);
    expect(cache.get(`key-${MAX_ENTRIES - 1}`)).toBe(MAX_ENTRIES - 1);
  });
});
