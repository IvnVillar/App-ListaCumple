import { describe, expect, it } from "vitest";
import { normalizeUrl } from "../normalizeUrl";

describe("normalizeUrl", () => {
  it("añade https:// cuando falta el esquema", () => {
    expect(normalizeUrl("www.tienda.example/producto")).toBe("https://www.tienda.example/producto");
    expect(normalizeUrl("tienda.example/producto")).toBe("https://tienda.example/producto");
  });

  it("recorta espacios antes de comprobar el esquema", () => {
    expect(normalizeUrl("  www.tienda.example  ")).toBe("https://www.tienda.example");
  });

  it("deja intactas las URLs que ya traen esquema", () => {
    expect(normalizeUrl("https://tienda.example/producto")).toBe("https://tienda.example/producto");
    expect(normalizeUrl("http://tienda.example/producto")).toBe("http://tienda.example/producto");
  });
});
