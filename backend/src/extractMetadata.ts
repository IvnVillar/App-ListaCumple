import * as cheerio from "cheerio";
import { fetchHtml, FetchError } from "./fetchHtml";
import { extractFromJsonLd } from "./extractors/jsonLd";
import { extractFromOpenGraph } from "./extractors/openGraph";
import { extractHeuristic } from "./extractors/heuristic";
import { TtlCache } from "./cache";
import type { ExtractedMetadata } from "./types";

const cache = new TtlCache<ExtractedMetadata>();

function resolveUrl(maybeRelative: string | null, baseUrl: string): string | null {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return null;
  }
}

function storeNameFromHost(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0];
  } catch {
    return null;
  }
}

function isComplete(fields: Partial<ExtractedMetadata>): boolean {
  return Boolean(fields.title && fields.image_url && fields.price != null);
}

export async function extractMetadata(inputUrl: string): Promise<ExtractedMetadata> {
  const cached = cache.get(inputUrl);
  if (cached) return cached;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    throw new FetchError("La URL proporcionada no es válida");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new FetchError("Solo se admiten URLs http/https");
  }

  const { html, finalUrl } = await fetchHtml(inputUrl);
  const $ = cheerio.load(html);

  const warnings: string[] = [];
  let strategy_used: ExtractedMetadata["strategy_used"] = "none";
  let fields: Partial<ExtractedMetadata> = {};

  const jsonLd = extractFromJsonLd($);
  if (jsonLd) {
    fields = jsonLd;
    strategy_used = "json-ld";
  }

  if (!isComplete(fields)) {
    const og = extractFromOpenGraph($);
    if (og) {
      fields = { ...og, ...fields };
      if (strategy_used === "none") strategy_used = "open-graph";
      else warnings.push("Campos completados con Open Graph tras JSON-LD incompleto");
    }
  }

  if (!isComplete(fields)) {
    const heuristic = extractHeuristic($);
    fields = { ...heuristic, ...fields };
    if (strategy_used === "none") strategy_used = "heuristic";
    else warnings.push("Campos completados con heurística HTML");
  }

  if (!fields.title && !fields.image_url && fields.price == null) {
    warnings.push(
      "No se pudo extraer información automáticamente. Es posible que la tienda cargue el contenido mediante JavaScript (SPA); completa los campos manualmente."
    );
  } else if (!isComplete(fields)) {
    warnings.push("Extracción parcial: revisa y completa los campos que falten manualmente.");
  }

  const result: ExtractedMetadata = {
    title: fields.title ?? null,
    image_url: resolveUrl(fields.image_url ?? null, finalUrl),
    price: fields.price ?? null,
    currency: fields.currency ?? null,
    store_name: fields.store_name ?? storeNameFromHost(finalUrl),
    source_url: finalUrl,
    strategy_used,
    warnings,
  };

  cache.set(inputUrl, result);
  return result;
}
