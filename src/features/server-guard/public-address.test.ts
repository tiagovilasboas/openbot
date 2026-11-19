import assert from "node:assert/strict";
import test from "node:test";
import { isPublicAddress } from "./public-address.ts";

test("public IPv4 and IPv6 addresses are accepted", () => {
  for (const ip of [
    "8.8.8.8",
    "1.1.1.1",
    "93.184.216.34",
    "172.15.0.1",
    "172.32.0.1",
    "100.63.255.255",
    "100.128.0.1",
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
    "::ffff:8.8.8.8",
  ]) {
    assert.equal(isPublicAddress(ip), true, ip);
  }
});

test("loopback, private, link-local, CGNAT, multicast and metadata are refused", () => {
  for (const ip of [
    "0.0.0.0",
    "10.0.0.1",
    "10.255.255.255",
    "100.64.0.1",
    "100.127.255.255",
    "127.0.0.1",
    "127.255.255.254",
    "169.254.169.254",
    "169.254.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.0.0.1",
    "192.0.2.1",
    "192.168.1.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "239.255.255.255",
    "240.0.0.1",
    "255.255.255.255",
  ]) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
});

test("IPv6 equivalents are refused, including embedded IPv4 forms", () => {
  for (const ip of [
    "::",
    "::1",
    "fe80::1",
    "febf::1",
    "fec0::1",
    "fc00::1",
    "fd00:ec2::254",
    "ff02::1",
    "2001:db8::1",
    "2001:0:4136:e378:8000:63bf:3fff:fdd2",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:169.254.169.254",
    "::ffff:10.0.0.1",
    "::10.0.0.1",
    "64:ff9b::7f00:1",
    "64:ff9b::a9fe:a9fe",
    "64:ff9b:1::a00:1",
    "64:ff9b:1:0:0:0:808:808",
    "::ffff:0:10.0.0.1",
    "::ffff:0:a9fe:a9fe",
    "2002:7f00:1::1",
    "2002:a9fe:a9fe::1",
  ]) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
});

test("anything that is not an IP literal fails closed", () => {
  for (const value of [
    undefined,
    "",
    "localhost",
    "example.com",
    "8.8.8",
    "8.8.8.8.8",
    "256.1.1.1",
    "fe80::1%eth0",
    "[::1]",
    "1::2::3",
  ]) {
    assert.equal(isPublicAddress(value), false, String(value));
  }
});
