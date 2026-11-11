import assert from "node:assert/strict";
import test from "node:test";
import { withPageCsp } from "./page-csp.ts";
import {
  buildContentSecurityPolicy,
  buildStaticSecurityHeaders,
  createNonce,
} from "./security-headers.ts";

function directive(csp: string, name: string): string {
  const found = csp.split("; ").find((d) => d.startsWith(`${name} `));
  assert.ok(found, `${name} present`);
  return found;
}

test("production CSP locks down framing, plugins, base and connections", () => {
  const csp = buildContentSecurityPolicy("abc", false);
  for (const d of [
    "default-src 'self'",
    "connect-src 'self'",
    "img-src 'self' data: blob:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ]) {
    assert.ok(csp.split("; ").includes(d), d);
  }
  assert.ok(!csp.includes("unsafe-eval"));
  assert.ok(!csp.includes("ws:"));
});

test("script-src and style-src carry the nonce and no 'unsafe-inline'", () => {
  const csp = buildContentSecurityPolicy("abc", false);
  const script = directive(csp, "script-src");
  const style = directive(csp, "style-src");
  assert.ok(script.includes("'nonce-abc'"));
  assert.ok(script.includes("'strict-dynamic'"));
  assert.ok(!script.includes("'unsafe-inline'"));
  assert.ok(style.includes("'nonce-abc'"));
  assert.ok(!style.includes("'unsafe-inline'"));
});

test("the only inline allowance is style attributes", () => {
  const csp = buildContentSecurityPolicy("abc", false);
  assert.equal(
    directive(csp, "style-src-attr"),
    "style-src-attr 'unsafe-inline'",
  );
  const withInline = csp
    .split("; ")
    .filter((d) => d.includes("'unsafe-inline'"));
  assert.deepEqual(withInline, ["style-src-attr 'unsafe-inline'"]);
});

test("dev CSP additionally allows eval and the hot reload websocket", () => {
  const csp = buildContentSecurityPolicy("abc", true);
  assert.ok(directive(csp, "script-src").includes("'unsafe-eval'"));
  assert.ok(csp.includes("connect-src 'self' ws: wss:"));
  assert.ok(!directive(csp, "script-src").includes("'unsafe-inline'"));
});

test("each call makes a different, well-formed nonce", () => {
  const nonces = new Set(Array.from({ length: 50 }, () => createNonce()));
  assert.equal(nonces.size, 50);
  for (const n of nonces) assert.match(n, /^[A-Za-z0-9+/]+=*$/);
  const a = withPageCsp(new Headers(), false);
  const b = withPageCsp(new Headers(), false);
  assert.notEqual(a.nonce, b.nonce);
  assert.notEqual(a.csp, b.csp);
});

test("the page CSP is set on the request headers Next reads and on the response value", () => {
  const incoming = new Headers({ "x-keep": "1", "x-nonce": "forged" });
  const { requestHeaders, csp, nonce } = withPageCsp(incoming, false, "n0nce");
  assert.equal(nonce, "n0nce");
  assert.equal(requestHeaders.get("x-nonce"), "n0nce");
  assert.equal(requestHeaders.get("content-security-policy"), csp);
  assert.equal(requestHeaders.get("x-keep"), "1");
  assert.ok(csp.includes("'nonce-n0nce'"));
  assert.equal(incoming.get("x-nonce"), "forged");
});

test("the static header list carries the hardening headers, not the CSP", () => {
  const keys = buildStaticSecurityHeaders().map((h) => h.key);
  assert.deepEqual(keys, [
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
  ]);
});
