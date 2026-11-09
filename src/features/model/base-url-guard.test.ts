import assert from "node:assert/strict";
import test from "node:test";
import { checkBaseUrl, type HostResolver } from "./base-url-guard.ts";

const noDns: HostResolver = async () => {
  throw new Error("resolver must not be called for literals");
};
const resolvesTo =
  (...addresses: string[]): HostResolver =>
  async () =>
    addresses;

async function blocked(url: string, resolver: HostResolver = noDns) {
  const verdict = await checkBaseUrl(url, resolver);
  assert.equal(verdict.ok, false, `${url} should be blocked`);
}
async function allowed(url: string, resolver: HostResolver = noDns) {
  const verdict = await checkBaseUrl(url, resolver);
  assert.equal(verdict.ok, true, `${url} should be allowed`);
}

test("blocks IPv4 private, link-local, CGNAT and unspecified ranges", async () => {
  for (const host of [
    "10.0.0.1",
    "10.255.255.255",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "169.254.0.1",
    "100.64.0.1",
    "100.127.255.255",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
  ]) {
    await blocked(`http://${host}/v1`);
  }
});

test("allows public IPv4 just outside the blocked ranges", async () => {
  for (const host of [
    "172.15.0.1",
    "172.32.0.1",
    "100.63.0.1",
    "100.128.0.1",
    "8.8.8.8",
  ]) {
    await allowed(`https://${host}/v1`);
  }
});

test("blocks obfuscated IPv4 forms the URL parser normalizes", async () => {
  await blocked("http://2852039166/"); // decimal 169.254.169.254
  await blocked("http://0xa9fea9fe/");
  await blocked("http://0251.0376.0251.0376/");
  await blocked("http://167772161/"); // 10.0.0.1
});

test("blocks IPv6 link-local, unique-local, unspecified and multicast", async () => {
  for (const host of [
    "[fe80::1]",
    "[febf::1]",
    "[fc00::1]",
    "[fd12:3456::1]",
    "[::]",
    "[ff02::1]",
  ]) {
    await blocked(`http://${host}:11434/`);
  }
  await allowed("http://[2606:4700::1111]/");
});

test("blocks IPv4-mapped and compatible IPv6 of blocked ranges", async () => {
  await blocked("http://[::ffff:169.254.169.254]/");
  await blocked("http://[::ffff:a9fe:a9fe]/");
  await blocked("http://[::ffff:10.0.0.1]/");
  await blocked("http://[::ffff:c0a8:0101]/");
  await blocked("http://[0:0:0:0:0:ffff:ac10:1]/");
  await blocked("http://[::10.0.0.1]/");
  await allowed("http://[::ffff:8.8.8.8]/");
  await allowed("http://[::ffff:127.0.0.1]/");
});

test("blocks cloud metadata hostnames without resolving them", async () => {
  await blocked("http://metadata.google.internal/computeMetadata/v1/");
  await blocked("http://METADATA.GOOGLE.INTERNAL./");
  await blocked("http://metadata/");
  await blocked("http://instance-data/latest/meta-data/");
});

test("blocks URLs with credentials and non-http schemes", async () => {
  await blocked("https://user:pass@example.com/v1");
  await blocked("https://user@example.com/v1");
  await blocked("file:///etc/passwd");
  await blocked("ftp://example.com/");
  await blocked("not a url");
});

test("allows loopback, including localhost and IPv6", async () => {
  await allowed("http://localhost:11434");
  await allowed("http://127.0.0.1:20128/v1");
  await allowed("http://127.8.9.10:3000");
  await allowed("http://[::1]:3000");
  await allowed("http://router.localhost:3000");
});

test("allows a public host that resolves only to public addresses", async () => {
  await allowed(
    "https://openrouter.ai/api/v1",
    resolvesTo("104.18.1.1", "2606:4700::1"),
  );
});

test("blocks a hostname that resolves to a private address", async () => {
  await blocked("https://evil.example/v1", resolvesTo("10.0.0.5"));
  await blocked("https://evil.example/v1", resolvesTo("169.254.169.254"));
  await blocked("https://evil.example/v1", resolvesTo("fe80::1"));
  await blocked("https://evil.example/v1", resolvesTo("::ffff:192.168.0.1"));
});

test("blocks when any resolved address is blocked (round-robin trick)", async () => {
  await blocked("https://evil.example/v1", resolvesTo("8.8.8.8", "10.0.0.5"));
});

test("allows a hostname resolving to loopback", async () => {
  await allowed("http://local.example:3000", resolvesTo("127.0.0.1"));
});

test("lets an unresolvable hostname through so fetch reports unreachable", async () => {
  await allowed("https://nope.example/v1", async () => {
    throw new Error("ENOTFOUND");
  });
});
