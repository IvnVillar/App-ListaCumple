const TIMEOUT_MS = 8000;

export class ClientFetchError extends Error {}

/**
 * Descarga una página desde el propio dispositivo (spec: repliegue cuando
 * una tienda bloquea la IP del servidor pero no una conexión residencial
 * normal). Sin cabeceras especiales: lo que hace falta aquí es la IP desde
 * la que sale la petición, no fingir ser un navegador.
 */
export async function fetchHtmlFromDevice(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new ClientFetchError(`La tienda respondió con estado ${response.status}`);
    }
    const html = await response.text();
    return { html, finalUrl: response.url || url };
  } catch (err) {
    if (err instanceof ClientFetchError) throw err;
    throw new ClientFetchError("No se pudo descargar la página desde el móvil");
  } finally {
    clearTimeout(timeout);
  }
}
