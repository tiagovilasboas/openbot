import assert from "node:assert/strict";
import test from "node:test";
import {
  decisionsFor,
  expireTurn,
  joinReplyText,
  pauseExpired,
  pauseTurn,
  resumeRequestFor,
} from "./paused-turn.ts";

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const pause = {
  turnId: "0f8e6c2a-1b2c-4d5e-8f90-123456789abc",
  expiresAt: 5000,
  calls: [
    {
      callId: "c1",
      name: "memory_add_note",
      preview: "likes tea",
      argsDigest: DIGEST_A,
      allowAlways: true,
    },
    {
      callId: "c2",
      name: "github_write",
      preview: "issue",
      argsDigest: DIGEST_B,
      allowAlways: false,
    },
  ],
};
const request = { language: "en", messages: [{ role: "user", text: "hi" }] };
const paused = pauseTurn({
  botId: "b1",
  messageId: 7,
  pause,
  request,
  text: "Let me save that.",
  steps: [],
});

test("a paused turn keeps the exact request and marks its calls pending", () => {
  assert.equal(paused.request, request);
  assert.deepEqual(
    paused.steps.map((step) => [step.callId, step.status]),
    [
      ["c1", "pending"],
      ["c2", "pending"],
    ],
  );
});

test("each call gets the choice, bound to its digest", () => {
  assert.deepEqual(decisionsFor(pause, "deny"), [
    { callId: "c1", decision: "deny", argsDigest: DIGEST_A },
    { callId: "c2", decision: "deny", argsDigest: DIGEST_B },
  ]);
  // "always" is only sent where the tool offers it.
  assert.deepEqual(
    decisionsFor(pause, "always").map((d) => d.decision),
    ["always", "once"],
  );
});

test("the resume request names the paused turn and the decisions", () => {
  const decisions = decisionsFor(pause, "once");
  assert.deepEqual(resumeRequestFor(paused, decisions), {
    botId: "b1",
    resume: { turnId: pause.turnId, decisions },
  });
});

test("a pause expires at its expiry time, and its waiting calls with it", () => {
  assert.equal(pauseExpired(paused, 4999), false);
  assert.equal(pauseExpired(paused, 5000), true);
  const expired = expireTurn(paused);
  assert.deepEqual(
    expired.steps.map((step) => step.status),
    ["expired", "expired"],
  );
  assert.equal(expired.text, paused.text);
});

test("text before and after the pause is joined by one blank line", () => {
  assert.equal(joinReplyText("Before. ", "  After."), "Before.\n\nAfter.");
  assert.equal(joinReplyText("", "After."), "After.");
  assert.equal(joinReplyText("Before.", ""), "Before.");
});
