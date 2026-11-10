import assert from "node:assert/strict";
import test from "node:test";

import { chatCopy } from "./chat-copy.ts";
import {
  describeModelFailure,
  describeModelFailurePlain,
} from "./describe-model-failure.ts";

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
    describeModelFailure({ kind: "unknown" }, "en"),
    chatCopy.en.modelError,
  );
  assert.equal(
    describeModelFailure({ kind: "unknown", status: 418 }, "pt"),
    `${chatCopy.pt.modelError} (HTTP 418)`,
  );
});

test("offline, timeout, server and cancel each read differently in both languages", () => {
  for (const language of ["pt", "en"] as const) {
    const c = chatCopy[language];
    assert.equal(
      describeModelFailure({ kind: "offline" }, language),
      c.modelErrorOffline,
    );
    assert.equal(
      describeModelFailure({ kind: "timeout" }, language),
      c.modelErrorTimeout,
    );
    assert.equal(
      describeModelFailure({ kind: "cancelled" }, language),
      c.cancelledNote,
    );
    assert.equal(
      describeModelFailure({ kind: "unreachable" }, language),
      c.modelErrorUnreachable,
    );
    assert.equal(
      describeModelFailure({ kind: "server", status: 502 }, language),
      `${c.modelErrorServer} (HTTP 502)`,
    );
    const texts = new Set(
      (["offline", "timeout", "server", "unreachable"] as const).map((kind) =>
        describeModelFailure({ kind }, language),
      ),
    );
    assert.equal(texts.size, 4, "no two failure kinds share a sentence");
  }
});

test("plain text drops the markdown emphasis", () => {
  assert.equal(
    describeModelFailurePlain({ kind: "timeout" }, "en").includes("**"),
    false,
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

test("a reply cut for length has its own sentence with an action, in both languages", () => {
  for (const language of ["pt", "en"] as const) {
    const c = chatCopy[language];
    const text = describeModelFailure({ kind: "response_too_long" }, language);
    assert.equal(text, c.modelErrorTooLong);
    assert.notEqual(text, c.modelError);
    assert.ok(text.length > 20);
  }
});
