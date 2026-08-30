import type { CheerioAPI } from "cheerio";
import type { ExtractedMetadata } from "../types";

// Acepta tanto miles agrupados ("1.234,56€", "1 234€") como una tirada de
// dígitos sin separador ("1234€") — con sólo la alternativa agrupada, un
// precio de 4+ cifras sin separador de miles perdía las primeras cifras.
const PRICE_REGEX = /((?:\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[.,]\d{2})?)\s?€/;
const PRICE_KEYWORDS = /(precio|price|pvp)/i;

function findLikelyImage($: CheerioAPI): string | null {
  const candidates: { src: string; area: number }[] = [];

  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (!src || src.startsWith("data:")) return;
    const width = Number($(el).attr("width")) || 0;
    const height = Number($(el).attr("height")) || 0;
    candidates.push({ src, area: width * height });
  });

  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (b.area > a.area ? b : a)).src;
}

function findLikelyPrice($: CheerioAPI): string | null {
  let found: string | null = null;

  $("body")
    .find("*")
    .each((_, el) => {
      if (found) return;
      const text = $(el).clone().children().remove().end().text().trim();
      if (!text || text.length > 80) return;
      if (!PRICE_REGEX.test(text)) return;

      const context = `${$(el).attr("class") ?? ""} ${$(el).attr("id") ?? ""} ${text}`;
      const nearKeyword = PRICE_KEYWORDS.test(context);
      const match = text.match(PRICE_REGEX);
      if (match && (nearKeyword || !found)) {
        found = match[1];
      }
    });

  return found;
}

export function extractHeuristic($: CheerioAPI): Partial<ExtractedMetadata> {
  const title = $("title").first().text().trim() || null;
  const image_url = findLikelyImage($);
  const rawPrice = findLikelyPrice($);
  const price = rawPrice
    ? Number(rawPrice.replace(/\s/g, "").replace(/\.(?=\d{3})/g, "").replace(",", "."))
    : null;

  return {
    title,
    image_url,
    price: price != null && Number.isFinite(price) ? price : null,
    currency: rawPrice ? "EUR" : null,
    store_name: null,
  };
}
