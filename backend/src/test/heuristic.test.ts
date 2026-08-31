import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { extractHeuristic } from "../extractors/heuristic";

function htmlWithPrice(priceText: string): string {
  return `<html><head><title>Producto de prueba</title></head><body><div class="precio">${priceText}</div></body></html>`;
}

describe("extractHeuristic - regex de precio", () => {
  it.each([
    ["1234€", 1234],
    ["1.234,56€", 1234.56],
    ["1 234€", 1234],
    ["29,99€", 29.99],
    ["10€", 10],
    ["12.345€", 12345],
  ])("extrae %s como %d", (text, expected) => {
    const $ = cheerio.load(htmlWithPrice(text));
    const result = extractHeuristic($);
    expect(result.price).toBe(expected);
  });
});

describe("extractHeuristic - prioriza el precio cerca de una palabra clave", () => {
  it("ignora un importe suelto anterior (p. ej. 'envío gratis a partir de 60€') si luego hay un precio real", () => {
    const html = `
      <html><head><title>Producto de prueba</title></head><body>
        <div class="banner">Envío gratis a partir de 60€</div>
        <div class="precio-producto">29,99€</div>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractHeuristic($);
    expect(result.price).toBe(29.99);
  });

  it("si ningún precio tiene palabra clave cerca, usa el primero encontrado", () => {
    const html = `
      <html><head><title>Producto de prueba</title></head><body>
        <div class="banner">Envío gratis a partir de 60€</div>
        <div class="otro">También disponible por 45€</div>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractHeuristic($);
    expect(result.price).toBe(60);
  });
});
