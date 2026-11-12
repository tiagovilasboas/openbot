import assert from "node:assert/strict";
import test from "node:test";
import { memorySyncErrorCode } from "./memory-sync-failure.ts";

const http = (status: number, error?: string) =>
  ({ kind: "http", status, ...(error && { error }) }) as const;

test("a lost connection and server errors stay quiet", () => {
  assert.equal(memorySyncErrorCode({ kind: "network" }), null);
  assert.equal(memorySyncErrorCode(http(500)), null);
  assert.equal(memorySyncErrorCode(http(503)), null);
});

test("a 413 and too_many_entries mean the notes are too large", () => {
  assert.equal(memorySyncErrorCode(http(413)), "too_large");
  assert.equal(
    memorySyncErrorCode(http(413, "payload_too_large")),
    "too_large",
  );
  assert.equal(memorySyncErrorCode(http(400, "too_many_entries")), "too_large");
});

test("too_many_bots has its own code", () => {
  assert.equal(
    memorySyncErrorCode(http(400, "too_many_bots")),
    "too_many_bots",
  );
});

test("access refusals and other 4xx are surfaced", () => {
  assert.equal(memorySyncErrorCode(http(401)), "unauthorized");
  assert.equal(memorySyncErrorCode(http(403)), "unauthorized");
  assert.equal(memorySyncErrorCode(http(400, "invalid_body")), "rejected");
});
