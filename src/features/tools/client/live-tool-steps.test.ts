import assert from "node:assert/strict";
import test from "node:test";
import {
  applyToolEvent,
  expirePending,
  markPending,
  toolRunning,
  toStoredSteps,
  type LiveToolStep,
} from "./live-tool-steps.ts";

const running = applyToolEvent([], {
  type: "tool_call",
  callId: "c1",
  name: "github_read",
  preview: "repo",
  policy: "auto",
});

test("a call runs until its result says ok, denied or error", () => {
  assert.deepEqual(running, [
    { callId: "c1", name: "github_read", status: "running", summary: "repo" },
  ]);
  assert.equal(toolRunning(running), true);
  const result = (ok: boolean, preview: string) =>
    applyToolEvent(running, {
      type: "tool_result",
      callId: "c1",
      ok,
      preview,
    })[0].status;
  assert.equal(result(true, "3 files"), "ok");
  assert.equal(result(false, "denied_by_user"), "denied");
  assert.equal(result(false, "approval_mismatch"), "error");
  assert.equal(
    toolRunning(
      applyToolEvent(running, {
        type: "tool_result",
        callId: "c1",
        ok: true,
        preview: "",
      }),
    ),
    false,
  );
});

test("other events leave the steps as they are", () => {
  assert.deepEqual(
    applyToolEvent(running, { type: "memory_changed" }),
    running,
  );
});

test("paused calls wait, then expire when the pause is gone", () => {
  const waiting = markPending(running, [
    {
      callId: "c2",
      name: "memory_add_note",
      preview: "likes tea",
      argsDigest: "a".repeat(64),
      allowAlways: true,
    },
  ]);
  assert.deepEqual(
    waiting.map((step) => step.status),
    ["running", "pending"],
  );
  assert.deepEqual(
    expirePending(waiting).map((step) => step.status),
    ["running", "expired"],
  );
});

test("stored steps keep the last eight, close open ones and cut summaries", () => {
  const many: LiveToolStep[] = Array.from({ length: 10 }, (_, n) => ({
    callId: `c${n}`,
    name: "github_read",
    status: n === 8 ? "running" : n === 9 ? "pending" : "ok",
    summary: n === 9 ? "y".repeat(400) : `s${n}`,
  }));
  const stored = toStoredSteps(many);
  assert.equal(stored.length, 8);
  assert.equal(stored[0].summary, "s2");
  assert.equal(stored[6].status, "error");
  assert.equal(stored[7].status, "expired");
  assert.equal(stored[7].summary.length, 300);
  assert.equal("callId" in stored[0], false);
});
