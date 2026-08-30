export interface ExtractedMetadata {
  title: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  store_name: string | null;
  source_url: string;
  strategy_used: "json-ld" | "open-graph" | "heuristic" | "none";
  warnings: string[];
}

export interface ExtractRequestBody {
  url: string;
}
