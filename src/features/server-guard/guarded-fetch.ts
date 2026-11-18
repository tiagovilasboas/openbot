import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createPinnedFetch } from "./pinned-fetch.ts";
import { isPublicAddress } from "./public-address.ts";

export type HostLookup = (hostname: string) => Promise<string[]>;

export type GuardedFetchCode =
  | "bad_url"
  | "blocked_address"
  | "dns_failed"
  | "too_many_redirects"
  | "fetch_failed";

export type GuardedFetchResult =
  | { ok: true; response: Response; finalUrl: string }
  | { ok: false; code: GuardedFetchCode };

export type GuardedFetchOptions = {
  signal?: AbortSignal;
  maxRedirects?: number;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  lookup?: HostLookup;
};

const DEFAULT_MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain"];

async function resolveAll(hostname: string): Promise<string[]> {
  const found = await dnsLookup(hostname, { all: true, verbatim: true });
  return found.map((entry) => entry.address);
}

/**
 * Accepts only http(s) URLs without credentials whose host resolves to public
 * addresses alone. Every resolved address must be public: one private answer
 * refuses the host. Returns the parsed URL on success.
 */
export async function checkPublicUrl(
  raw: string,
  lookup: HostLookup = resolveAll,
): Promise<
  | { ok: true; url: URL }
  | { ok: false; code: "bad_url" | "blocked_address" | "dns_failed" }
> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, code: "bad_url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, code: "bad_url" };
  }
  if (url.username || url.password) return { ok: false, code: "bad_url" };

  // WHATWG parsing already turns 2130706433 or 0x7f.1 into 127.0.0.1.
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host) return { ok: false, code: "bad_url" };

  if (isIP(host)) {
    return isPublicAddress(host)
      ? { ok: true, url }
      : { ok: false, code: "blocked_address" };
  }
  const name = host.toLowerCase();
  if (name === "localhost" || BLOCKED_SUFFIXES.some((s) => name.endsWith(s))) {
    return { ok: false, code: "blocked_address" };
  }

  let addresses: string[];
  try {
    addresses = await lookup(host);
  } catch {
    return { ok: false, code: "dns_failed" };
  }
  if (addresses.length === 0) return { ok: false, code: "dns_failed" };
  return addresses.every(isPublicAddress)
    ? { ok: true, url }
    : { ok: false, code: "blocked_address" };
}

/**
 * GET that never follows a redirect on its own: each hop (the first URL and
 * every Location) goes through checkPublicUrl first, up to maxRedirects hops.
 * The caller owns the response body and must read or cancel it.
 *
 * By default the request goes through a pinned transport that connects only
 * to addresses validated at connect time, so DNS rebinding between the check
 * and the connection cannot reach a private address.
 */
export async function guardedFetch(
  raw: string,
  options: GuardedFetchOptions = {},
): Promise<GuardedFetchResult> {
  const fetchImpl =
    options.fetchImpl ??
    createPinnedFetch({ resolve: options.lookup ?? resolveAll });
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  let current = raw;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const checked = await checkPublicUrl(current, options.lookup);
    if (!checked.ok) return checked;

    let response: Response;
    try {
      response = await fetchImpl(checked.url.href, {
        method: "GET",
        redirect: "manual",
        headers: options.headers,
        signal: options.signal,
      });
    } catch (error) {
      const blocked =
        error instanceof Error && error.message === "blocked_address";
      return { ok: false, code: blocked ? "blocked_address" : "fetch_failed" };
    }

    if (!REDIRECT_STATUSES.has(response.status)) {
      return { ok: true, response, finalUrl: checked.url.href };
    }
    const location = response.headers.get("location");
    await response.body?.cancel().catch(() => undefined);
    if (!location) return { ok: false, code: "fetch_failed" };
    try {
      current = new URL(location, checked.url).href;
    } catch {
      return { ok: false, code: "bad_url" };
    }
  }
  return { ok: false, code: "too_many_redirects" };
}
