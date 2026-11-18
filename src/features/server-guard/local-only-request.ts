import { trustsProxy, type ClientKeyEnv } from "./client-key.ts";
import { isLoopbackAddress } from "./loopback-address.ts";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Headers a reverse proxy or tunnel adds; any of them means "not direct". */
const PROXY_MARKERS = [
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  "via",
  "cf-connecting-ip",
] as const;

/**
 * True when the Host header names this machine: localhost, 127.0.0.1 or [::1],
 * port ignored, case ignored, one trailing dot allowed. A rebinding domain
 * that resolves to 127.0.0.1 keeps its own name in Host and is refused.
 */
export function isLocalHostHeader(host: string | null): boolean {
  if (!host) return false;
  const value = host.trim().toLowerCase();
  const name = value.startsWith("[")
    ? value.slice(0, value.indexOf("]") + 1)
    : value.split(":")[0];
  return LOCAL_HOSTS.has(name.replace(/\.$/, ""));
}

export function hasProxyMarker(headers: Headers): boolean {
  return PROXY_MARKERS.some((name) => headers.has(name));
}

export type LocalOnlyRefusal = "loopback_only";

/**
 * For routes that hand out or use a local secret: the caller must be a direct
 * loopback connection to a local host name, with no proxy in between and no
 * OPENBOT_TRUST_PROXY (which would make the address a proxy's claim).
 */
export function isDirectLocalRequest(
  headers: Headers,
  address: string | undefined,
  env: ClientKeyEnv,
): boolean {
  return (
    isLoopbackAddress(address) &&
    isLocalHostHeader(headers.get("host")) &&
    !hasProxyMarker(headers) &&
    !trustsProxy(env)
  );
}
