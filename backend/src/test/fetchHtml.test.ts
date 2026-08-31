import { describe, expect, it } from "vitest";
import { friendlyStatusMessage } from "../fetchHtml";

describe("friendlyStatusMessage", () => {
  it("explica un bloqueo anti-bot en vez de mostrar el código crudo", () => {
    expect(friendlyStatusMessage(403)).toMatch(/bloquea/i);
    expect(friendlyStatusMessage(401)).toMatch(/bloquea/i);
  });

  it("distingue página no encontrada de un bloqueo", () => {
    expect(friendlyStatusMessage(404)).toMatch(/no existe/i);
  });

  it("sugiere reintentar ante rate limiting o errores del servidor de la tienda", () => {
    expect(friendlyStatusMessage(429)).toMatch(/inténtalo de nuevo/i);
    expect(friendlyStatusMessage(500)).toMatch(/inténtalo de nuevo/i);
    expect(friendlyStatusMessage(503)).toMatch(/inténtalo de nuevo/i);
  });

  it("cae a un mensaje genérico para códigos sin caso especial", () => {
    expect(friendlyStatusMessage(418)).toBe("La tienda respondió con estado 418");
  });
});
