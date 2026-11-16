import { lookup } from "node:dns/promises";
import { classifyIpLiteral } from "./ip-address-policy.ts";

/** Resolves a hostname to every address it points at. Injectable for tests. */
export type HostResolver = (hostname: string) => Promise<string[]>;

export type BlockReason =
  "invalid_url" | "credentials" | "blocked_host" | "blocked_address";

/**
 * The addresses a hostname was checked against. The connection must use
 * exactly these (see pinned-dispatcher.ts), never a fresh DNS answer.
 */
export type PinnedHost = { hostname: string; addresses: string[] };

/** `pin` is null for an IP literal host: there is nothing to resolve. */
export type BaseUrlVerdict =
  { ok: true; pin: PinnedHost | null } | { ok: false; reason: BlockReason };

const METADATA_HOSTNAMES = new Set([
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "instance-data.ec2.internal",
  "metadata.azure.com",
]);

// RFC 6761: localhost names always mean loopback, without asking DNS.
const LOOPBACK_ADDRESSES = ["127.0.0.1", "::1"];

export const defaultHostResolver: HostResolver = async (hostname) => {
  const records = await lookup(hostname, { all: true });
  return records.map((record) => record.address);
};

/** Lower case without the trailing root dot, as the guard compares names. */
export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function isLoopbackName(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

function isAllowedAddress(address: string): boolean {
  const verdict = classifyIpLiteral(address);
  return verdict === "public" || verdict === "loopback";
}

/**
 * Decides whether the server may call a client-supplied model base URL.
 *
 * Policy: http(s) only, no embedded credentials, no cloud metadata names,
 * and no private, link-local, CGNAT, documentation, unspecified, multicast
 * or reserved addresses, either as a literal host or among the addresses
 * the name resolves to. Loopback stays allowed because local routers and
 * Ollama are supported.
 *
 * DNS rebinding: the name is resolved once, here, and the verdict carries
 * the checked addresses as a pin. The caller connects to the pin, so a DNS
 * server cannot answer differently between the check and the connection.
 */
export async function checkBaseUrl(
  rawUrl: string,
  resolver: HostResolver = defaultHostResolver,
): Promise<BaseUrlVerdict> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "invalid_url" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "credentials" };
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname) return { ok: false, reason: "invalid_url" };
  if (METADATA_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: "blocked_host" };
  }

  const literal = classifyIpLiteral(hostname);
  if (literal) {
    return literal === "blocked"
      ? { ok: false, reason: "blocked_address" }
      : { ok: true, pin: null };
  }
  if (isLoopbackName(hostname)) {
    return { ok: true, pin: { hostname, addresses: LOOPBACK_ADDRESSES } };
  }

  let addresses: string[];
  try {
    addresses = await resolver(hostname);
  } catch {
    // Unresolvable: an empty pin makes the connection fail as unreachable.
    return { ok: true, pin: { hostname, addresses: [] } };
  }
  return addresses.every(isAllowedAddress)
    ? { ok: true, pin: { hostname, addresses } }
    : { ok: false, reason: "blocked_address" };
}
