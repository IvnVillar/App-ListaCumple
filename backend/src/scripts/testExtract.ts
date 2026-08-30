import { extractMetadata } from "../extractMetadata";

const TEST_URLS = [
  "https://www.amazon.es/Meguiars-Quik-Detailer-Interior-interiores/dp/B001B0XDXY",
  "https://www.zara.com/es/es/camiseta-estampado-nirvana---p02160604.html",
  "https://www.elcorteingles.es/moda-hombre/A200487290-negro-pr-zapatilla-de-hombre-modelo-esplar-de-cuero-con-cordones/",
  "https://www.etsy.com/",
  "https://httpbin.org/redirect-to?url=https://www.zara.com/es/es/camiseta-estampado-nirvana---p02160604.html",
];

async function main() {
  for (const url of TEST_URLS) {
    console.log(`\n=== ${url} ===`);
    try {
      const result = await extractMetadata(url);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("FALLÓ:", err instanceof Error ? err.message : err);
      if (err instanceof Error && "cause" in err) {
        console.error("  causa:", (err as { cause?: unknown }).cause);
      }
    }
  }
}

main();
