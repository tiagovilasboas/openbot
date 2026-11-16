import assert from "node:assert/strict";
import test from "node:test";
import { describeModelFailure } from "./describe-model-failure.ts";
import { describeResetWait, formatResetWait } from "./reset-wait.ts";
import { parseStreamEvent } from "./stream-event-parser.ts";

test("waits are rounded up to seconds, minutes or hours", () => {
  assert.equal(formatResetWait(1), "1 s");
  assert.equal(formatResetWait(59), "59 s");
  assert.equal(formatResetWait(61), "2 min");
  assert.equal(formatResetWait(3600), "1 h");
  assert.equal(formatResetWait(3700), "1 h 2 min");
});

test("the reset notice follows the language and is empty without a time", () => {
  assert.equal(describeResetWait(120, "en"), "The limit resets in 2 min");
  assert.equal(describeResetWait(120, "pt"), "O limite renova em 2 min");
  assert.equal(describeResetWait(120, "es"), "El límite se renueva en 2 min");
  assert.equal(describeResetWait(undefined, "en"), "");
});

test("a rate-limit failure with a reset adds the wait to the message", () => {
  const plain = describeModelFailure({ kind: "rate_limit", status: 429 }, "en");
  const timed = describeModelFailure(
    { kind: "rate_limit", status: 429, resetSeconds: 300 },
    "en",
  );
  assert.ok(timed.startsWith(plain));
  assert.match(timed, /resets in 5 min\.$/);
});

test("the client reads the reset from the done and error events", () => {
  const done = parseStreamEvent(
    JSON.stringify({
      type: "done",
      provider: "router",
      failover: {
        fromModel: "a",
        toModel: "b",
        reason: "429: rate_limited",
        resetSeconds: 90,
      },
    }),
  );
  assert.equal(done?.type === "done" && done.failover?.resetSeconds, 90);
  const error = parseStreamEvent(
    JSON.stringify({
      type: "error",
      code: "rate_limit",
      provider: "router",
      status: 429,
      resetSeconds: 30,
    }),
  );
  assert.equal(error?.type === "error" && error.resetSeconds, 30);
});
