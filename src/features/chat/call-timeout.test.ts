import assert from "node:assert/strict";
import test from "node:test";

import { CHAT_CALL_TIMEOUT_MS, createCallSignal } from "./call-timeout.ts";

test("the default limit is 120 seconds", () => {
  assert.equal(CHAT_CALL_TIMEOUT_MS, 120_000);
});

test("the signal aborts when the limit passes (fake timers)", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const call = createCallSignal();
  t.mock.timers.tick(CHAT_CALL_TIMEOUT_MS - 1);
  assert.equal(call.signal.aborted, false);
  t.mock.timers.tick(1);
  assert.equal(call.signal.aborted, true);
  assert.equal(call.timedOut(), true);
  assert.equal(call.cancelled(), false);
});

test("a user cancel aborts without counting as a timeout", () => {
  const user = new AbortController();
  const call = createCallSignal(user.signal, 60_000);
  user.abort();
  assert.equal(call.signal.aborted, true);
  assert.equal(call.cancelled(), true);
  assert.equal(call.timedOut(), false);
  call.dispose();
});

test("disposing stops the timer", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const call = createCallSignal();
  call.dispose();
  t.mock.timers.tick(CHAT_CALL_TIMEOUT_MS * 2);
  assert.equal(call.signal.aborted, false);
});
