import { lookup } from "node:dns/promises";
import { classifyIpLiteral } from "./ip-address-policy.ts";

/** Resolves a hostname to every address it points at. Injectable for tests. */
export type HostResolver = (hostname: string) => Promise<string[]>;

export type BlockReason =
  "invalid_url" | "credentials" | "blocked_host" | "blocked_address";

export type BaseUrlVerdict = { ok: true } | { ok: false; reason: BlockReason };

const METADATA_HOSTNAMES = new Set([
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "instance-data.ec2.internal",
  "metadata.azure.com",
]);

export const defaultHostResolver: HostResolver = async (hostname) => {
  const records = await lookup(hostname, { all: true });
  return records.map((record) => record.address);
};

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
 * and no private, link-local, CGNAT, unspecified or multicast addresses,
 * either as a literal host or among the addresses the name resolves to.
 * Loopback stays allowed because local routers and Ollama are supported.
 *
 * DNS rebinding: the name is resolved here and again by fetch, so an
 * attacker-controlled DNS server could answer differently the second time.
 * Node's fetch offers no portable way to pin the checked address without a
 * custom dispatcher, so that window is a documented residual risk.
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

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname) return { ok: false, reason: "invalid_url" };
  if (METADATA_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: "blocked_host" };
  }

  const literal = classifyIpLiteral(hostname);
  if (literal) {
    return literal === "blocked"
      ? { ok: false, reason: "blocked_address" }
      : { ok: true };
  }
  if (isLoopbackName(hostname)) return { ok: true };

  let addresses: string[];
  try {
    addresses = await resolver(hostname);
  } catch {
    // Unresolvable: fetch fails on its own and is reported as unreachable.
    return { ok: true };
  }
  return addresses.every(isAllowedAddress)
    ? { ok: true }
    : { ok: false, reason: "blocked_address" };
}
