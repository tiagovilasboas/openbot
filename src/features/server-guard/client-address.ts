import { trustsProxy, type ClientKeyEnv } from "./client-key.ts";

/**
 * The address the loopback check looks at, or undefined when unknown.
 *
 * Next fills `X-Forwarded-For` with the socket address only when the header is
 * missing, and exposes no other peer address, so this is the same source the
 * rate limiter uses (see client-key.ts).
 *
 * With OPENBOT_TRUST_PROXY=1 it is the LAST hop, the one your own proxy
 * appended. Without it nothing vouches for the header, so a chain of several
 * hops is unknown (refused): a direct browser on this machine sends a single
 * value, the socket address Next wrote (127.0.0.1, ::1 or ::ffff:127.0.0.1).
 * A remote caller who forges a single "127.0.0.1" is the case this cannot
 * detect; bind the server to loopback (`next start -H 127.0.0.1`) to rule it
 * out.
 */
export function clientAddress(
  headers: Headers,
  env: ClientKeyEnv,
): string | undefined {
  const hops = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim());
  if (hops.some((hop) => !hop)) return undefined;
  if (trustsProxy(env)) return hops[hops.length - 1];
  return hops.length === 1 ? hops[0] : undefined;
}
