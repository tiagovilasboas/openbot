import {
  CLIENT_HEADER,
  CLIENT_HEADER_VALUE,
  type GuardDecision,
} from "./guard-types.ts";

/**
 * Cross-site protection. A browser always labels cross-site requests with
 * Origin, so when Origin is present it must be this very host. Without Origin
 * (curl, same-origin GET) the caller must prove intent with the custom header,
 * which a cross-site page cannot add without a CORS preflight we never grant.
 */
export function checkOrigin(headers: Headers): GuardDecision {
  const origin = headers.get("origin");
  if (origin !== null) {
    const host = headers.get("host");
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (!host || originHost !== host) {
      return { ok: false, status: 403, error: "forbidden_origin" };
    }
    return { ok: true };
  }
  if (headers.get(CLIENT_HEADER) !== CLIENT_HEADER_VALUE) {
    return { ok: false, status: 403, error: "missing_client_header" };
  }
  return { ok: true };
}
