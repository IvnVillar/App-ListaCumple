import { describe, expect, it } from "vitest";
import { resolveItemFields, sanitizeExtractedMetadata } from "../services/ownerLists";
import type { ExtractedMetadata } from "../types";

const baseExtracted: ExtractedMetadata = {
  title: "Título extraído",
  image_url: "https://tienda.example/img.jpg",
  price: 19.99,
  currency: "EUR",
  store_name: "tienda",
  source_url: "https://tienda.example/producto",
  strategy_used: "json-ld",
  warnings: [],
};

describe("resolveItemFields", () => {
  it("usa los datos extraídos cuando no hay campos manuales", () => {
    const result = resolveItemFields({ source_url: baseExtracted.source_url }, baseExtracted);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.title).toBe("Título extraído");
      expect(result.input.price).toBe(19.99);
    }
  });

  it("un campo manual gana siempre sobre el extraído, aunque sea explícitamente null", () => {
    const result = resolveItemFields({ title: "Mi título", price: null }, baseExtracted);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.title).toBe("Mi título");
      expect(result.input.price).toBeNull(); // null explícito != "no enviado"
      expect(result.input.currency).toBe("EUR"); // no enviado, cae al extraído
    }
  });

  it("sin título manual ni extraído, devuelve missing_title en vez de crear el item", () => {
    const result = resolveItemFields({}, { ...baseExtracted, title: null });
    expect(result).toEqual({ ok: false, reason: "missing_title" });
  });

  it("sourceUrl siempre viene del manual, nunca del extraído (pueden diferir tras redirects)", () => {
    const result = resolveItemFields(
      { source_url: "https://bit.ly/abc", title: "X" },
      { ...baseExtracted, source_url: "https://tienda.example/producto-final" }
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.input.sourceUrl).toBe("https://bit.ly/abc");
  });
});

describe("sanitizeExtractedMetadata", () => {
  it("descarta un precio negativo", () => {
    const sanitized = sanitizeExtractedMetadata({ ...baseExtracted, price: -5 });
    expect(sanitized?.price).toBeNull();
  });

  it("descarta una moneda que no son 3 letras", () => {
    const sanitized = sanitizeExtractedMetadata({ ...baseExtracted, currency: "EURO" });
    expect(sanitized?.currency).toBeNull();
  });

  it("recorta el nombre de tienda a 120 caracteres", () => {
    const sanitized = sanitizeExtractedMetadata({ ...baseExtracted, store_name: "x".repeat(200) });
    expect(sanitized?.store_name).toHaveLength(120);
  });

  it("con null de entrada, devuelve null", () => {
    expect(sanitizeExtractedMetadata(null)).toBeNull();
  });

  it("normaliza la moneda a mayúsculas", () => {
    const sanitized = sanitizeExtractedMetadata({ ...baseExtracted, currency: "eur" });
    expect(sanitized?.currency).toBe("EUR");
  });
});
