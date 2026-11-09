import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "./security-headers.ts";

test("production CSP locks down framing, plugins, base and connections", () => {
  const csp = buildContentSecurityPolicy(false);
  for (const directive of [
    "default-src 'self'",
    "connect-src 'self'",
    "img-src 'self' data: blob:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ]) {
    assert.ok(csp.split("; ").includes(directive), directive);
  }
  assert.ok(!csp.includes("unsafe-eval"));
  assert.ok(!csp.includes("ws:"));
});

test("dev CSP additionally allows eval and the hot reload websocket", () => {
  const csp = buildContentSecurityPolicy(true);
  assert.ok(csp.includes("'unsafe-eval'"));
  assert.ok(csp.includes("connect-src 'self' ws: wss:"));
});

test("the header list carries the CSP and the hardening headers", () => {
  const keys = buildSecurityHeaders(false).map((h) => h.key);
  assert.deepEqual(keys, [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
  ]);
});
