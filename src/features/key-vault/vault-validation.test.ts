import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_KEY_LENGTH,
  validateKey,
  validateOrigin,
  validateProvider,
} from "./vault-validation.ts";

test("providers are limited to the known ids", () => {
  assert.deepEqual(validateProvider("router"), { ok: true, value: "router" });
  assert.deepEqual(validateProvider("anthropic"), {
    ok: true,
    value: "anthropic",
  });
  for (const bad of ["local", "", "ROUTER", undefined, 3, null]) {
    assert.deepEqual(validateProvider(bad), {
      ok: false,
      code: "invalid_provider",
    });
  }
});

test("keys are trimmed and bounded", () => {
  assert.deepEqual(validateKey("  sk-abc  "), { ok: true, value: "sk-abc" });
  assert.equal(validateKey("k".repeat(MAX_KEY_LENGTH)).ok, true);
  for (const bad of [
    "",
    "   ",
    "k".repeat(MAX_KEY_LENGTH + 1),
    "sk abc",
    "sk\tabc",
    "sk\nabc",
    "sk\u0000abc",
    "sk\u007fabc",
    42,
    undefined,
  ]) {
    assert.deepEqual(validateKey(bad), { ok: false, code: "invalid_key" });
  }
});

test("origins keep only the origin and require https", () => {
  assert.deepEqual(validateOrigin("https://openrouter.ai/api/v1?x=1#y"), {
    ok: true,
    value: "https://openrouter.ai",
  });
  assert.deepEqual(validateOrigin("https://user:pw@api.example.com:8443/p"), {
    ok: true,
    value: "https://api.example.com:8443",
  });
});

test("http is accepted only for loopback hosts", () => {
  for (const ok of [
    "http://localhost:11434/v1",
    "http://127.0.0.1:8080",
    "http://127.3.4.5",
    "http://[::1]:3000/x",
  ]) {
    assert.equal(validateOrigin(ok).ok, true, ok);
  }
  for (const bad of [
    "http://example.com",
    "http://192.168.0.2",
    "http://127.0.0.1.evil.com",
    "http://localhost.evil.com",
    "ftp://example.com",
    "not a url",
    "",
    undefined,
  ]) {
    assert.deepEqual(validateOrigin(bad), {
      ok: false,
      code: "invalid_origin",
    });
  }
});
