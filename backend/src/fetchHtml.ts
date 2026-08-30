import { Agent, buildConnector, interceptors, request } from "undici";
import { BlockedAddressError, isBlockedConnectTarget, safeLookup } from "./ssrfGuard";

const REAL_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTIONS = 5;

// safeLookup cubre el caso "hostname a resolver", pero cuando el destino de
// la conexión YA es una IP literal (p. ej. tras una redirección a
// http://169.254.169.254/), Node ni siquiera llama a `lookup` — por eso
// se valida también aquí, antes de delegar en el conector real de undici.
// Se aplica a nivel de Agent, así que cubre cada salto de una redirección.
const baseConnector = buildConnector({ lookup: safeLookup });

const guardedConnector: typeof baseConnector = (options, callback) => {
  if (isBlockedConnectTarget(options.hostname)) {
    callback(new BlockedAddressError(`Dirección bloqueada por seguridad: ${options.hostname}`), null);
    return;
  }
  baseConnector(options, callback);
};

const redirectingAgent = new Agent({ connect: guardedConnector }).compose(
  interceptors.redirect({ maxRedirections: MAX_REDIRECTIONS })
);

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
    if (err instanceof BlockedAddressError || (err as { cause?: unknown })?.cause instanceof BlockedAddressError) {
      throw new FetchError("No se puede acceder a esa dirección");
    }
    throw new FetchError("No se pudo obtener la página de la tienda", err);
  } finally {
    clearTimeout(timeout);
  }
}
