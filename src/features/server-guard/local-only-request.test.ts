import assert from "node:assert/strict";
import test from "node:test";
import {
  hasProxyMarker,
  isDirectLocalRequest,
  isLocalHostHeader,
} from "./local-only-request.ts";

test("only local host names pass, port and case ignored", () => {
  for (const host of [
    "localhost",
    "localhost:3000",
    "LOCALHOST:3000",
    "localhost.",
    "127.0.0.1:3000",
    "[::1]:3000",
    "[::1]",
  ]) {
    assert.equal(isLocalHostHeader(host), true, host);
  }
  for (const host of [
    null,
    "",
    "evil.example:3000",
    "localhost.evil.example",
    "127.0.0.1.evil.example",
    "0.0.0.0:3000",
    "192.168.1.5:3000",
    "[::2]",
  ]) {
    assert.equal(isLocalHostHeader(host), false, String(host));
  }
});

test("each proxy marker is detected", () => {
  for (const name of [
    "Forwarded",
    "X-Forwarded-Host",
    "X-Forwarded-Proto",
    "X-Real-IP",
    "Via",
    "CF-Connecting-IP",
  ]) {
    assert.equal(hasProxyMarker(new Headers({ [name]: "x" })), true, name);
  }
  assert.equal(
    hasProxyMarker(new Headers({ "x-forwarded-for": "::1" })),
    false,
  );
});

test("a direct request needs loopback, local host, no proxy, no trust flag", () => {
  const local = new Headers({ host: "localhost:3000" });
  assert.equal(isDirectLocalRequest(local, "::1", {}), true);
  assert.equal(isDirectLocalRequest(local, "203.0.113.1", {}), false);
  assert.equal(isDirectLocalRequest(local, undefined, {}), false);
  assert.equal(
    isDirectLocalRequest(new Headers({ host: "evil.example" }), "::1", {}),
    false,
  );
  assert.equal(
    isDirectLocalRequest(
      new Headers({ host: "localhost", via: "1.1 p" }),
      "::1",
      {},
    ),
    false,
  );
  assert.equal(
    isDirectLocalRequest(local, "::1", { OPENBOT_TRUST_PROXY: "1" }),
    false,
  );
});
