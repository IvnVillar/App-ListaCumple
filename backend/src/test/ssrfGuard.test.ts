import { describe, expect, it } from "vitest";
import { isBlockedConnectTarget, isBlockedIp } from "../ssrfGuard";

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1",
    "127.0.0.53",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // metadatos de nube (AWS/GCP/Azure)
    "0.0.0.0",
    "100.64.0.1",
    "192.0.2.1",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "fe80::1",
    "fc00::1",
    "::ffff:127.0.0.1",
  ])("bloquea %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each(["93.184.216.34", "8.8.8.8", "142.250.185.78", "2606:4700:4700::1111"])(
    "permite %s (IP pública)",
    (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    }
  );

  it("bloquea por defecto una cadena que no es una IP válida", () => {
    expect(isBlockedIp("no-soy-una-ip")).toBe(true);
  });
});

describe("isBlockedConnectTarget", () => {
  it("bloquea cuando el host de conexión ya es una IP literal privada (sin pasar por lookup)", () => {
    expect(isBlockedConnectTarget("127.0.0.1")).toBe(true);
    expect(isBlockedConnectTarget("169.254.169.254")).toBe(true);
  });

  it("no bloquea un hostname normal (ese caso lo cubre safeLookup al resolverlo)", () => {
    expect(isBlockedConnectTarget("www.example.com")).toBe(false);
  });

  it("permite una IP literal pública", () => {
    expect(isBlockedConnectTarget("93.184.216.34")).toBe(false);
  });
});
