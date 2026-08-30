import type { CheerioAPI } from "cheerio";
import type { ExtractedMetadata } from "../types";

function meta($: CheerioAPI, property: string): string | null {
  const byProperty = $(`meta[property="${property}"]`).attr("content");
  if (byProperty) return byProperty;
  const byName = $(`meta[name="${property}"]`).attr("content");
  return byName ?? null;
}

export function extractFromOpenGraph($: CheerioAPI): Partial<ExtractedMetadata> | null {
  const title = meta($, "og:title");
  const image = meta($, "og:image");
  const rawPrice = meta($, "product:price:amount") ?? meta($, "og:price:amount");
  const currency = meta($, "product:price:currency") ?? meta($, "og:price:currency");
  const siteName = meta($, "og:site_name");

  if (!title && !image && !rawPrice) return null;

  const price = rawPrice ? Number(rawPrice.replace(",", ".")) : null;

  return {
    title,
    image_url: image,
    price: price != null && Number.isFinite(price) ? price : null,
    currency: currency ?? null,
    store_name: siteName,
  };
}
