import assert from "node:assert/strict";
import test from "node:test";

import { chatCopy } from "./chat-copy.ts";
import { describeModelFailure } from "./describe-model-failure.ts";

test("each actionable failure gets its own message", () => {
  assert.equal(
    describeModelFailure({ kind: "auth", status: 401 }, "pt"),
    chatCopy.pt.modelErrorAuth,
  );
  assert.equal(
    describeModelFailure({ kind: "rate_limit", status: 429 }, "en"),
    chatCopy.en.modelErrorRateLimit,
  );
  assert.equal(
    describeModelFailure({ kind: "model_unavailable", status: 404 }, "pt"),
    chatCopy.pt.modelErrorModel,
  );
});

test("other failures keep the generic message, with the status if known", () => {
  assert.equal(
    describeModelFailure({ kind: "unreachable" }, "en"),
    chatCopy.en.modelError,
  );
  assert.equal(
    describeModelFailure({ kind: "unknown", status: 502 }, "pt"),
    `${chatCopy.pt.modelError} (HTTP 502)`,
  );
});

test("a blocked model address explains the restriction in both languages", () => {
  assert.equal(
    describeModelFailure({ kind: "blocked_url" }, "pt"),
    chatCopy.pt.modelErrorBlockedUrl,
  );
  assert.equal(
    describeModelFailure({ kind: "blocked_url" }, "en"),
    chatCopy.en.modelErrorBlockedUrl,
  );
});
