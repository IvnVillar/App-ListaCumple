import { Agent, interceptors, request } from "undici";

const REAL_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTIONS = 5;

const redirectingAgent = new Agent().compose(interceptors.redirect({ maxRedirections: MAX_REDIRECTIONS }));

export class FetchError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "FetchError";
  }
}

export async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await request(url, {
      method: "GET",
      dispatcher: redirectingAgent,
      signal: controller.signal,
      headers: {
        "User-Agent": REAL_BROWSER_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    if (response.statusCode >= 300) {
      // >=400 es un error real; 3xx aquí significa que se agotaron las
      // MAX_REDIRECTIONS redirecciones sin llegar a una respuesta final, y
      // undici entrega esa última respuesta de redirección tal cual en vez
      // de seguir — sin este chequeo se parsearía la página-puente como si
      // fuera el producto.
      throw new FetchError(`La tienda respondió con estado ${response.statusCode}`);
    }

    const history = (response.context as { history?: unknown[] })?.history;
    const finalUrl = history?.length ? String(history[history.length - 1]) : url;

    const html = await response.body.text();
    return { html, finalUrl };
  } catch (err) {
    if (err instanceof FetchError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchError("Timeout al contactar con la tienda");
    }
    throw new FetchError("No se pudo obtener la página de la tienda", err);
  } finally {
    clearTimeout(timeout);
  }
}
