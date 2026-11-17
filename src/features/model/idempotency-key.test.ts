import assert from "node:assert/strict";
import { test } from "node:test";
import { readIdempotencyKey } from "./idempotency-key.ts";

const headers = (value?: string) =>
  new Headers(value === undefined ? {} : { "idempotency-key": value });

test("a missing key is accepted", () => {
  assert.deepEqual(readIdempotencyKey(headers()), { ok: true });
});

test("a well-formed key is returned", () => {
  assert.deepEqual(readIdempotencyKey(headers("0a1b2c3d-4e5f")), {
    ok: true,
    key: "0a1b2c3d-4e5f",
  });
});

test("odd keys are refused", () => {
  const odd = ["", "short", "has space in it", "x".repeat(65), "a.b.c.d.e.f.g"];
  for (const bad of odd) {
    assert.deepEqual(readIdempotencyKey(headers(bad)), { ok: false }, bad);
  }
});
