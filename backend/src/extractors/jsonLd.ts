import type { CheerioAPI } from "cheerio";
import type { ExtractedMetadata } from "../types";

type JsonLdNode = Record<string, unknown>;

function flattenGraph(node: unknown): JsonLdNode[] {
  if (Array.isArray(node)) return node.flatMap(flattenGraph);
  if (node && typeof node === "object") {
    const obj = node as JsonLdNode;
    if (Array.isArray(obj["@graph"])) return flattenGraph(obj["@graph"]);
    return [obj];
  }
  return [];
}

function isProductNode(node: JsonLdNode): boolean {
  const type = node["@type"];
  if (typeof type === "string") return type === "Product";
  if (Array.isArray(type)) return type.includes("Product");
  return false;
}

function firstImage(image: unknown): string | null {
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return firstImage(image[0]);
  if (image && typeof image === "object" && "url" in (image as JsonLdNode)) {
    return firstImage((image as JsonLdNode).url);
  }
  return null;
}

function extractOffer(offers: unknown): { price: number | null; currency: string | null } {
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (!offer || typeof offer !== "object") return { price: null, currency: null };
  const o = offer as JsonLdNode;
  const rawPrice = o.price ?? (o.priceSpecification as JsonLdNode | undefined)?.price;
  const price = rawPrice != null ? Number(String(rawPrice).replace(",", ".")) : null;
  const currency =
    (o.priceCurrency as string | undefined) ??
    ((o.priceSpecification as JsonLdNode | undefined)?.priceCurrency as string | undefined) ??
    null;
  return { price: Number.isFinite(price) ? price : null, currency };
}

function brandName(brand: unknown): string | null {
  if (typeof brand === "string") return brand;
  if (brand && typeof brand === "object") {
    const name = (brand as JsonLdNode).name;
    if (typeof name === "string") return name;
  }
  return null;
}

export function extractFromJsonLd($: CheerioAPI): Partial<ExtractedMetadata> | null {
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const script of scripts) {
    const raw = $(script).contents().text();
    if (!raw?.trim()) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const nodes = flattenGraph(parsed);
    const product = nodes.find(isProductNode);
    if (!product) continue;

    const { price, currency } = extractOffer(product.offers);

    return {
      title: typeof product.name === "string" ? product.name : null,
      image_url: firstImage(product.image),
      price,
      currency,
      store_name: brandName(product.brand),
    };
  }

  return null;
}
