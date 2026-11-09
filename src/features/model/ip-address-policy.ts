import { isIP } from "node:net";

/**
 * Pure classification of IP literals for the model base URL guard.
 * "loopback" is allowed on purpose (local routers and Ollama); "blocked"
 * covers private, link-local, CGNAT, unspecified, multicast and reserved
 * space; everything else is "public".
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
  const [a, b] = octets;
  if (a === 127) return "loopback";
  if (a === 0 || a === 10) return "blocked";
  if (a === 172 && b >= 16 && b <= 31) return "blocked";
  if (a === 192 && b === 168) return "blocked";
  if (a === 169 && b === 254) return "blocked";
  if (a === 100 && b >= 64 && b <= 127) return "blocked";
  if (a >= 224) return "blocked";
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

function classifyIpv6(groups: number[]): AddressClass {
  const leadingZero = groups.slice(0, 5).every((g) => g === 0);
  // IPv4-mapped (::ffff:a.b.c.d) and deprecated IPv4-compatible (::a.b.c.d).
  if (leadingZero && (groups[5] === 0xffff || groups[5] === 0)) {
    const plain = groups[5] === 0 && groups[6] === 0 && groups[7] <= 1;
    if (!plain) {
      return classifyIpv4([
        groups[6] >> 8,
        groups[6] & 255,
        groups[7] >> 8,
        groups[7] & 255,
      ]);
    }
  }
  if (groups.slice(0, 7).every((g) => g === 0)) {
    return groups[7] === 1 ? "loopback" : "blocked"; // ::1 or ::
  }
  const first = groups[0];
  if ((first & 0xffc0) === 0xfe80) return "blocked"; // fe80::/10
  if ((first & 0xfe00) === 0xfc00) return "blocked"; // fc00::/7
  if ((first & 0xff00) === 0xff00) return "blocked"; // multicast
  return "public";
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
