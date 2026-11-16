import { isIP } from "node:net";

/**
 * Pure classification of IP literals for the model base URL guard.
 * "loopback" is allowed on purpose (local routers and Ollama); "blocked"
 * covers every IANA special-purpose range the server must never dial
 * (private, link-local, CGNAT, unspecified, documentation, benchmarking,
 * IETF protocol assignments, multicast and reserved space); everything
 * else is "public".
 */
export type AddressClass = "public" | "loopback" | "blocked";

function parseIpv4(text: string): number[] | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) =>
    /^\d{1,3}$/.test(part) ? Number(part) : NaN,
  );
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : null;
}

function classifyIpv4(octets: number[]): AddressClass {
  const [a, b, c] = octets;
  if (a === 127) return "loopback";
  if (a === 0 || a === 10) return "blocked";
  // 192.0.0.0/24 IETF protocol assignments, 192.0.2.0/24 TEST-NET-1.
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return "blocked";
  if (a === 198 && (b === 18 || b === 19)) return "blocked"; // benchmarking
  if (a === 198 && b === 51 && c === 100) return "blocked"; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return "blocked"; // TEST-NET-3
  if (a === 172 && b >= 16 && b <= 31) return "blocked";
  if (a === 192 && b === 168) return "blocked";
  if (a === 169 && b === 254) return "blocked";
  if (a === 100 && b >= 64 && b <= 127) return "blocked";
  if (a >= 224) return "blocked"; // multicast, 240/4 and broadcast
  return "public";
}

/** Expands an IPv6 literal into eight 16-bit groups. */
function parseIpv6(text: string): number[] | null {
  let source = text.split("%")[0].toLowerCase();
  const lastColon = source.lastIndexOf(":");
  if (source.includes(".")) {
    const v4 = parseIpv4(source.slice(lastColon + 1));
    if (!v4) return null;
    const high = ((v4[0] << 8) | v4[1]).toString(16);
    const low = ((v4[2] << 8) | v4[3]).toString(16);
    source = `${source.slice(0, lastColon + 1)}${high}:${low}`;
  }
  const halves = source.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const fill: string[] = halves.length === 2 ? Array(missing).fill("0") : [];
  const values = [...head, ...fill, ...tail].map((group) =>
    /^[0-9a-f]{1,4}$/.test(group) ? parseInt(group, 16) : NaN,
  );
  return values.length === 8 && values.every((v) => !Number.isNaN(v))
    ? values
    : null;
}

function v4From(high: number, low: number): number[] {
  return [high >> 8, high & 255, low >> 8, low & 255];
}

/** An embedded IPv4 only counts as safe when it is plainly public. */
function isPublicIpv4(octets: number[]): boolean {
  return classifyIpv4(octets) === "public";
}

/**
 * Tunnel and translation prefixes that carry an IPv4 address. Unlike
 * IPv4-mapped space, loopback is refused here: the gateway would reach its
 * own loopback, never the one the operator meant to allow.
 *  - NAT64 64:ff9b::/96 (RFC 6052): IPv4 in the last 32 bits.
 *  - NAT64 local-use 64:ff9b:1::/48 (RFC 8215): never globally routable.
 *  - 6to4 2002::/16: IPv4 in bits 16-47.
 *  - Teredo 2001::/32: server IPv4 in bits 32-63, client IPv4 in the last
 *    32 bits XORed with 0xffffffff.
 */
function embedsBlockedIpv4(g: number[]): boolean {
  if (g[0] === 0x64 && g[1] === 0xff9b) {
    if (g[2] === 1) return true;
    if (g.slice(2, 6).every((x) => x === 0)) {
      return !isPublicIpv4(v4From(g[6], g[7]));
    }
  }
  if (g[0] === 0x2002) {
    return !isPublicIpv4(v4From(g[1], g[2]));
  }
  if (g[0] === 0x2001 && g[1] === 0) {
    const server = v4From(g[2], g[3]);
    const client = v4From(g[6] ^ 0xffff, g[7] ^ 0xffff);
    return !isPublicIpv4(server) || !isPublicIpv4(client);
  }
  return false;
}

/** IPv4-mapped, IPv4-translated and IPv4-compatible forms of an IPv4. */
function embeddedIpv4(g: number[]): number[] | null {
  if (!g.slice(0, 4).every((x) => x === 0)) return null;
  const v4 = v4From(g[6], g[7]);
  if (g[4] === 0 && g[5] === 0xffff) return v4; // ::ffff:a.b.c.d
  if (g[4] === 0xffff && g[5] === 0) return v4; // ::ffff:0:a.b.c.d
  const plain = g[6] === 0 && g[7] <= 1; // :: and ::1 are not IPv4
  return g[4] === 0 && g[5] === 0 && !plain ? v4 : null; // ::a.b.c.d
}

/** Special-purpose ranges inside the global unicast block 2000::/3. */
function isReservedGlobalIpv6(g: number[]): boolean {
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  if (g[0] === 0x3fff && g[1] < 0x1000) return true; // documentation /20
  if (g[0] === 0x2001 && g[1] === 2 && g[2] === 0) return true; // benchmark
  return false;
}

function classifyIpv6(groups: number[]): AddressClass {
  const v4 = embeddedIpv4(groups);
  if (v4) return classifyIpv4(v4);
  if (groups.slice(0, 7).every((g) => g === 0)) {
    return groups[7] === 1 ? "loopback" : "blocked"; // ::1 or ::
  }
  if (embedsBlockedIpv4(groups)) return "blocked";
  const nat64 =
    groups[0] === 0x64 &&
    groups[1] === 0xff9b &&
    groups.slice(2, 6).every((g) => g === 0); // 64:ff9b::/96 only
  // Outside 2000::/3 nothing is globally routable unicast: this covers
  // 100::/64 discard, fc00::/7 ULA, fe80::/10 and fec0::/10 link and site
  // local, ff00::/8 multicast and every unassigned reserved block.
  if ((groups[0] & 0xe000) !== 0x2000 && !nat64) return "blocked";
  return isReservedGlobalIpv6(groups) ? "blocked" : "public";
}

/** Returns null when the text is not an IP literal (for example a hostname). */
export function classifyIpLiteral(text: string): AddressClass | null {
  const bare = text.replace(/^\[|\]$/g, "");
  const family = isIP(bare.split("%")[0]);
  if (family === 4) {
    const octets = parseIpv4(bare);
    return octets ? classifyIpv4(octets) : "blocked";
  }
  if (family === 6) {
    const groups = parseIpv6(bare);
    return groups ? classifyIpv6(groups) : "blocked";
  }
  return null;
}
