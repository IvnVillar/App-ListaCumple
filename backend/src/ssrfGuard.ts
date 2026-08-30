import dns from "node:dns";
import { isIP } from "node:net";

/**
 * Bloquea IPs privadas/reservadas (loopback, RFC1918, link-local —
 * incluye 169.254.169.254, el endpoint de metadatos de la mayoría de
 * clouds—, etc). Se usa en dos puntos de fetchHtml.ts: al resolver un
 * hostname (safeLookup) y al conectar directamente a una IP literal
 * (guardedConnect) — un host destino que ya es una IP nunca pasa por
 * `lookup`, así que sin el segundo punto quedaría sin proteger.
 */
export class BlockedAddressError extends Error {}

function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && parts[2] === 2) return true; // TEST-NET-1
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
  if (a === 198 && b === 51 && parts[2] === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && parts[2] === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast (224-239) + reserved (240-255)

  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true; // fe80::/10 (approx)
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7 unique local
  if (normalized.startsWith("ff")) return true; // multicast

  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);

  return false;
}

/** Sólo debe llamarse con una IP ya válida (literal, o ya resuelta por DNS). */
export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIPv4(ip);
  if (version === 6) return isBlockedIPv6(ip);
  return true; // no es una IP reconocible: por seguridad, bloquear
}

/** Para cuando el host destino de la conexión ya es una IP literal (no pasa por lookup). */
export function isBlockedConnectTarget(host: string): boolean {
  return isIP(host) !== 0 && isBlockedIp(host);
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number
) => void;

/** Sustituye a dns.lookup: resuelve normal, pero rechaza si toda la resolución cae en rango bloqueado. */
export function safeLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, [] as unknown as string);

    const list = addresses as dns.LookupAddress[];
    const allowed = list.filter((entry) => !isBlockedIp(entry.address));

    if (allowed.length === 0) {
      return callback(
        new BlockedAddressError(`Dirección bloqueada por seguridad: ${hostname}`),
        [] as unknown as string
      );
    }

    if (options.all) {
      callback(null, allowed);
    } else {
      callback(null, allowed[0].address, allowed[0].family);
    }
  });
}
