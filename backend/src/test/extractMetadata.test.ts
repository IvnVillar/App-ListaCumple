import { describe, expect, it, vi } from "vitest";
import { extractMetadata } from "../extractMetadata";

vi.mock("../fetchHtml", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../fetchHtml")>();
  return { ...actual, fetchHtml: vi.fn() };
});

import { fetchHtml } from "../fetchHtml";

describe("extractMetadata - cascada no debe perder datos ya encontrados", () => {
  it("completa el precio vía Open Graph cuando el JSON-LD no trae offers", async () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          { "@type": "Product", "name": "Zapatillas de test", "image": "https://tienda.example/img.jpg" }
        </script>
        <meta property="og:title" content="Zapatillas de test (OG)" />
        <meta property="product:price:amount" content="49.99" />
        <meta property="product:price:currency" content="EUR" />
      </head><body></body></html>
    `;
    vi.mocked(fetchHtml).mockResolvedValue({ html, finalUrl: "https://tienda.example/producto" });

    const result = await extractMetadata("https://tienda.example/producto");

    expect(result.title).toBe("Zapatillas de test");
    expect(result.image_url).toBe("https://tienda.example/img.jpg");
    expect(result.price).toBe(49.99);
    expect(result.currency).toBe("EUR");
  });

  it("acepta una URL pegada sin esquema (p. ej. 'www.tienda.example/...')", async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Producto sin esquema" />
      </head><body></body></html>
    `;
    vi.mocked(fetchHtml).mockResolvedValue({ html, finalUrl: "https://tienda.example/producto" });

    const result = await extractMetadata("www.tienda.example/producto");

    expect(fetchHtml).toHaveBeenCalledWith("https://www.tienda.example/producto");
    expect(result.title).toBe("Producto sin esquema");
  });
});
