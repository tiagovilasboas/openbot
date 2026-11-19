import { isIP } from "node:net";

/** Parses a dotted IPv4 into 4 octets, or null when it is not one. */
function ipv4Octets(address: string): number[] | null {
  if (isIP(address) !== 4) return null;
  return address.split(".").map(Number);
}

/**
 * Parses an IPv6 text form into 16 bytes (handles "::" and a trailing dotted
 * IPv4). Returns null when it is not valid IPv6. Zone ids are rejected.
 */
function ipv6Bytes(address: string): number[] | null {
  if (isIP(address) !== 6) return null;
  let text = address.toLowerCase();
  const tail = text.slice(text.lastIndexOf(":") + 1);
  if (tail.includes(".")) {
    const v4 = ipv4Octets(tail);
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    text = `${text.slice(0, text.lastIndexOf(":") + 1)}${hi}:${lo}`;
  }
  const [head, rest, extra] = text.split("::");
  if (extra !== undefined) return null;
  const left = head ? head.split(":") : [];
  const right = rest ? rest.split(":") : [];
  const fill = rest === undefined ? 0 : 8 - left.length - right.length;
  if (fill < 0 || (rest === undefined && left.length !== 8)) return null;
  const groups = [...left, ...Array(fill).fill("0"), ...right];
  if (groups.length !== 8) return null;
  const bytes: number[] = [];
  for (const group of groups) {
    const value = Number.parseInt(group, 16);
    if (Number.isNaN(value)) return null;
    bytes.push(value >> 8, value & 0xff);
  }
  return bytes;
}

/** True when the IPv4 octets are outside the public unicast space. */
function isNonPublicIpv4([a, b, c]: number[]): boolean {
  return (
    a === 0 || // "this network"
    a === 10 || // private
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 0 && c === 0) || // IETF protocol assignments
    (a === 192 && b === 0 && c === 2) || // TEST-NET-1
    (a === 192 && b === 168) || // private
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) || // TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // TEST-NET-3
    a >= 224 // multicast, reserved, broadcast
  );
}

function isNonPublicIpv6(bytes: number[]): boolean {
  const embedded = (offset: number) => bytes.slice(offset, offset + 4);
  const zeros = (from: number, to: number) =>
    bytes.slice(from, to).every((byte) => byte === 0);
  // :: and ::1 and IPv4-compatible ::a.b.c.d
  if (zeros(0, 12)) return true;
  // IPv4-mapped ::ffff:a.b.c.d judged as the IPv4 it carries
  if (zeros(0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isNonPublicIpv4(embedded(12));
  }
  // NAT64 64:ff9b::/96 judged as the embedded IPv4
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    zeros(4, 12)
  ) {
    return isNonPublicIpv4(embedded(12));
  }
  // NAT64 local use 64:ff9b:1::/48 (RFC 8215): the embedded IPv4 position
  // depends on the prefix length, so the whole range is refused
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    bytes[4] === 0x00 &&
    bytes[5] === 0x01
  ) {
    return true;
  }
  // SIIT IPv4-translated ::ffff:0:a.b.c.d judged as the IPv4 it carries
  if (zeros(0, 8) && bytes[8] === 0xff && bytes[9] === 0xff && zeros(10, 12)) {
    return isNonPublicIpv4(embedded(12));
  }
  // 6to4 2002::/16 judged as the embedded IPv4
  if (bytes[0] === 0x20 && bytes[1] === 0x02) {
    return isNonPublicIpv4(embedded(2));
  }
  if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0xc0) return true; // fec0::/10
  if (bytes[0] === 0xff) return true; // multicast
  if (bytes[0] === 0x20 && bytes[1] === 0x01) {
    if (bytes[2] === 0x0d && bytes[3] === 0xb8) return true; // documentation
    if (bytes[2] === 0x00 && bytes[3] === 0x00) return true; // Teredo
  }
  return false;
}

/**
 * True only for a literal IP address that is certainly on the public
 * internet. Loopback, private, link-local (incl. 169.254.169.254), CGNAT,
 * multicast, reserved and documentation ranges, and the IPv6 equivalents
 * (including IPv4-mapped, NAT64 and 6to4 forms) are not public. Anything
 * that is not an IP literal is not public either: the check fails closed.
 */
export function isPublicAddress(address: string | undefined): boolean {
  if (!address) return false;
  const v4 = ipv4Octets(address);
  if (v4) return !isNonPublicIpv4(v4);
  const v6 = ipv6Bytes(address);
  if (v6) return !isNonPublicIpv6(v6);
  return false;
}
