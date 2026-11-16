import assert from "node:assert/strict";
import test from "node:test";
import { classifyIpLiteral, type AddressClass } from "./ip-address-policy.ts";

function expectAll(expected: AddressClass, addresses: string[]) {
  for (const address of addresses) {
    assert.equal(classifyIpLiteral(address), expected, address);
  }
}

test("IPv4 special-purpose ranges are blocked at both borders", () => {
  expectAll("blocked", [
    "0.0.0.0",
    "0.255.255.255", // 0.0.0.0/8
    "100.64.0.0",
    "100.127.255.255", // CGNAT 100.64.0.0/10
    "192.0.0.0",
    "192.0.0.255", // IETF protocol assignments 192.0.0.0/24
    "192.0.2.0",
    "192.0.2.255", // TEST-NET-1
    "198.18.0.0",
    "198.19.255.255", // benchmarking 198.18.0.0/15
    "198.51.100.0",
    "198.51.100.255", // TEST-NET-2
    "203.0.113.0",
    "203.0.113.255", // TEST-NET-3
    "224.0.0.0",
    "239.255.255.255", // multicast 224.0.0.0/4
    "240.0.0.0",
    "255.255.255.254", // reserved 240.0.0.0/4
    "255.255.255.255", // limited broadcast
  ]);
});

test("IPv4 addresses just outside the special ranges stay public", () => {
  expectAll("public", [
    "1.0.0.0",
    "100.63.255.255",
    "100.128.0.0",
    "191.255.255.255",
    "192.0.1.0",
    "192.0.1.255",
    "192.0.3.0",
    "198.17.255.255",
    "198.20.0.0",
    "198.51.99.255",
    "198.51.101.0",
    "203.0.112.255",
    "203.0.114.0",
    "223.255.255.255",
  ]);
});

test("IPv6 special-purpose ranges are blocked at both borders", () => {
  expectAll("blocked", [
    "::", // unspecified ::/128
    "2001:db8::",
    "2001:db8:ffff:ffff:ffff:ffff:ffff:ffff", // documentation /32
    "3fff::",
    "3fff:fff:ffff:ffff:ffff:ffff:ffff:ffff", // documentation 3fff::/20
    "2001:2::",
    "2001:2:0:ffff:ffff:ffff:ffff:ffff", // benchmarking 2001:2::/48
    "100::",
    "100::ffff:ffff:ffff:ffff", // discard 100::/64
    "fc00::",
    "fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff", // ULA fc00::/7
    "fe80::",
    "febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff", // link-local fe80::/10
    "fec0::1", // deprecated site-local
    "ff00::",
    "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff", // multicast ff00::/8
    "1fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff", // reserved below 2000::/3
    "4000::", // reserved above 2000::/3
    "64:ff9b:2::808:808", // not the well-known NAT64 /96
  ]);
});

test("IPv6 addresses just outside the special ranges stay public", () => {
  expectAll("public", [
    "2000::",
    "3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    "2001:db7:ffff:ffff:ffff:ffff:ffff:ffff",
    "2001:db9::",
    "3ffe:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    "3fff:1000::",
    "2001:3::",
    "2001:2:1::",
    "2606:4700::1111",
    "64:ff9b::808:808",
  ]);
});

test("IPv4-mapped, translated and compatible forms follow the IPv4 verdict", () => {
  expectAll("blocked", [
    "::ffff:192.0.2.1",
    "::ffff:198.18.0.1",
    "::ffff:0.0.0.0",
    "::ffff:255.255.255.255",
    "::ffff:0:10.0.0.1", // IPv4-translated ::ffff:0:0/96
    "::ffff:0:203.0.113.9",
    "::192.0.2.1", // deprecated IPv4-compatible
    "::0.0.0.2",
    "64:ff9b::192.0.2.1", // NAT64 of TEST-NET-1
    "2002:c612:1::", // 6to4 of 198.18.0.1
  ]);
  expectAll("public", ["::ffff:8.8.8.8", "::ffff:0:8.8.8.8"]);
  expectAll("loopback", ["::1", "::ffff:127.0.0.1", "127.0.0.1"]);
});

test("hostnames are not IP literals", () => {
  assert.equal(classifyIpLiteral("example.com"), null);
});
