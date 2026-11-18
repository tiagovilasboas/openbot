import assert from "node:assert/strict";
import test from "node:test";

import {
  readReplyFailure,
  replyFailureAction,
  replyFailureOf,
} from "./reply-failure.ts";
import { sanitizeStoredMessage } from "./stored-message.ts";

test("a model failure becomes the stored kind; a cancel stores none", () => {
  assert.equal(replyFailureOf({ kind: "auth", status: 401 }), "auth");
  assert.equal(replyFailureOf({ kind: "server", status: 502 }), "server");
  assert.equal(replyFailureOf({ kind: "cancelled" }), undefined);
});

test("setup failures open Settings, transient ones retry", () => {
  for (const kind of [
    "auth",
    "access_required",
    "model_unavailable",
    "blocked_url",
    "unconfigured",
  ] as const) {
    assert.equal(replyFailureAction(kind), "settings", kind);
  }
  for (const kind of [
    "rate_limit",
    "unreachable",
    "offline",
    "timeout",
    "server",
    "unknown",
  ] as const) {
    assert.equal(replyFailureAction(kind), "retry", kind);
  }
  assert.equal(replyFailureAction("response_too_long"), "none");
});

test("only known kinds are read back", () => {
  assert.equal(readReplyFailure("auth"), "auth");
  assert.equal(readReplyFailure("cancelled"), undefined);
  assert.equal(readReplyFailure("<script>"), undefined);
  assert.equal(readReplyFailure(7), undefined);
});

test("a stored thread keeps the failure and still loads without it", () => {
  const base = { id: 2, role: "assistant", language: "en", text: "x" };
  assert.equal(
    sanitizeStoredMessage({ ...base, failure: "unconfigured" })?.failure,
    "unconfigured",
  );
  assert.equal(sanitizeStoredMessage(base)?.failure, undefined);
  assert.equal(
    sanitizeStoredMessage({ ...base, failure: "bogus" })?.failure,
    undefined,
  );
});

test("a switched-off provider is stored, read back and fixed in Settings", () => {
  assert.equal(
    replyFailureOf({ kind: "provider_off", provider: "router" }),
    "provider_off",
  );
  assert.equal(readReplyFailure("provider_off"), "provider_off");
  assert.equal(replyFailureAction("provider_off"), "settings");
});
