import { describe, expect, it, vi } from "vitest";
import { extractMetadata, extractMetadataFromHtml } from "../extractMetadata";

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

describe("extractMetadataFromHtml - analiza HTML que ya trajo el cliente, sin red", () => {
  it("extrae los campos del HTML dado, sin llamar a fetchHtml", async () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          { "@type": "Product", "name": "Camiseta traída por el móvil", "image": "img.jpg",
            "offers": { "price": "19.99", "priceCurrency": "EUR" } }
        </script>
      </head><body></body></html>
    `;

    const callsBefore = vi.mocked(fetchHtml).mock.calls.length;
    const result = extractMetadataFromHtml("https://tienda-bloqueada.example/producto", html);

    // No debe tocar la red: fetchHtml sigue con las mismas llamadas de antes.
    expect(vi.mocked(fetchHtml).mock.calls.length).toBe(callsBefore);
    expect(result.title).toBe("Camiseta traída por el móvil");
    expect(result.price).toBe(19.99);
    expect(result.currency).toBe("EUR");
    // Sin final_url explícito, resuelve las URLs relativas contra la propia URL pedida.
    expect(result.image_url).toBe("https://tienda-bloqueada.example/img.jpg");
  });

  it("resuelve imágenes relativas contra final_url cuando se indica (p. ej. tras una redirección que siguió el propio móvil)", () => {
    const html = `<meta property="og:title" content="Producto redirigido" />
      <meta property="og:image" content="/img.jpg" />`;

    const result = extractMetadataFromHtml(
      "https://acortador.example/x",
      html,
      "https://tienda-final.example/producto"
    );

    expect(result.image_url).toBe("https://tienda-final.example/img.jpg");
  });

  it("rechaza una URL inválida sin necesidad de tocar la red", () => {
    expect(() => extractMetadataFromHtml("", "<html></html>")).toThrow("La URL proporcionada no es válida");
  });
});
