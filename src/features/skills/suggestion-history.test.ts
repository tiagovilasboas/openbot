import assert from "node:assert/strict";
import test from "node:test";
import {
  clipHistory,
  SUGGEST_MAX_MESSAGE_LENGTH,
  SUGGEST_MAX_MESSAGES,
  userMessagesOf,
} from "./suggestion-history.ts";

test("each message is one trimmed line cut to the limit", () => {
  const long = "x".repeat(SUGGEST_MAX_MESSAGE_LENGTH + 50);
  const [first, second] = clipHistory([
    "  two\n\nlines\tand\u0007bell  ",
    long,
  ]);
  assert.equal(first, "two lines and bell");
  assert.equal(second?.length, SUGGEST_MAX_MESSAGE_LENGTH);
});

test("non-strings and empty messages are dropped", () => {
  assert.deepEqual(clipHistory(["a", 3, null, {}, "  ", "b"]), ["a", "b"]);
  assert.deepEqual(clipHistory("not a list"), []);
  assert.deepEqual(clipHistory(undefined), []);
});

test("only the most recent messages are kept, in order", () => {
  const all = Array.from({ length: 60 }, (_, i) => `m${i}`);
  const kept = clipHistory(all);
  assert.equal(kept.length, SUGGEST_MAX_MESSAGES);
  assert.equal(kept[0], "m20");
  assert.equal(kept.at(-1), "m59");
});

test("the worst case history stays well under the 64 KB body limit", () => {
  const worst = Array.from({ length: 200 }, () => "é".repeat(1000));
  const body = JSON.stringify({ language: "pt", messages: clipHistory(worst) });
  assert.ok(new TextEncoder().encode(body).length < 32 * 1024);
});

test("only what the user wrote is read from a stored conversation", () => {
  const stored = [
    { role: "user", text: "first" },
    { role: "assistant", text: "reply" },
    { role: "user", text: "second" },
  ];
  assert.deepEqual(userMessagesOf(stored), ["first", "second"]);
});
