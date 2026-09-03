import { formatEventDate } from "./date";

describe("formatEventDate", () => {
  it("devuelve null si no hay fecha", () => {
    expect(formatEventDate(null)).toBeNull();
    expect(formatEventDate(undefined)).toBeNull();
    expect(formatEventDate("")).toBeNull();
  });

  it("formatea una fecha válida en español", () => {
    expect(formatEventDate("2026-01-05")).toBe("5 ene 2026");
    expect(formatEventDate("2026-12-24")).toBe("24 dic 2026");
  });

  it("devuelve null ante una fecha con componentes inválidos", () => {
    expect(formatEventDate("no-es-una-fecha")).toBeNull();
  });
});
