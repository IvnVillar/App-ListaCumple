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
