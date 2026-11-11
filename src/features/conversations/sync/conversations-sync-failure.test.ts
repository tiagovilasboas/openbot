import assert from "node:assert/strict";
import test from "node:test";
import { conversationsSyncErrorCode } from "./conversations-sync-failure.ts";

const http = (status: number, error?: string) =>
  ({ kind: "http", status, ...(error && { error }) }) as const;

test("a lost connection and server errors stay quiet", () => {
  assert.equal(conversationsSyncErrorCode({ kind: "network" }), null);
  assert.equal(conversationsSyncErrorCode(http(500)), null);
  assert.equal(conversationsSyncErrorCode(http(503)), null);
});

test("a 413 and too_many_messages mean the thread is too large", () => {
  assert.equal(conversationsSyncErrorCode(http(413)), "too_large");
  assert.equal(
    conversationsSyncErrorCode(http(413, "payload_too_large")),
    "too_large",
  );
  assert.equal(
    conversationsSyncErrorCode(http(400, "too_many_messages")),
    "too_large",
  );
});

test("too_many_threads has its own code", () => {
  assert.equal(
    conversationsSyncErrorCode(http(400, "too_many_threads")),
    "too_many_threads",
  );
});

test("access refusals and other 4xx are surfaced", () => {
  assert.equal(conversationsSyncErrorCode(http(401)), "unauthorized");
  assert.equal(conversationsSyncErrorCode(http(403)), "unauthorized");
  assert.equal(
    conversationsSyncErrorCode(http(400, "invalid_body")),
    "rejected",
  );
});
