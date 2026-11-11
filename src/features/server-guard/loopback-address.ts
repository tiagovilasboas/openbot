const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const MAPPED_IPV4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

function isLoopbackIpv4(address: string): boolean {
  const match = IPV4.exec(address);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  return octets.every((octet) => octet <= 255) && octets[0] === 127;
}

/**
 * True only for an address that is certainly this machine: 127.0.0.0/8, ::1
 * and the IPv4-mapped form ::ffff:127.x.x.x. Anything else, including a
 * missing or malformed value, a hostname, or an address with a port or zone,
 * is not loopback: the check fails closed.
 */
export function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  const value = address.trim();
  if (value === "::1") return true;
  const mapped = MAPPED_IPV4.exec(value);
  return isLoopbackIpv4(mapped ? mapped[1] : value);
}
