import assert from "node:assert/strict";
import test from "node:test";
import { runToolLoop } from "./run-tool-loop.ts";
import type { PendingCall, ResumeDecision } from "./tool-loop-types.ts";
import {
  drain,
  fakeTool,
  loopInput,
  scriptedStep,
  sha,
} from "./tool-loop-fixtures.ts";

const argsJson = '{"text":"remember"}';
const pending: PendingCall = {
  callId: "k1",
  name: "ask",
  argsJson,
  argsDigest: sha(argsJson),
  preview: "ask",
};

function resume(decisions: ResumeDecision[]) {
  const { step, inputs } = scriptedStep([{ text: "final" }]);
  const ask = fakeTool({ name: "ask", policy: "ask", allowAlways: true });
  const { input, audit } = loopInput([ask.tool], step, {
    budget: { steps: 1, calls: 1, resultChars: 0 },
    resume: { pendingCalls: [pending], decisions },
  });
  return { input, audit, inputs, runs: ask.runs };
}

test("resume once runs the stored arguments exactly once", async () => {
  const run = resume([
    { callId: "k1", decision: "once", argsDigest: pending.argsDigest },
  ]);
  const { events, outcome } = await drain(runToolLoop(run.input));
  assert.deepEqual(run.runs, [{ text: "remember" }]);
  assert.equal(run.inputs[0].toolTranscript[0].call.argsJson, argsJson);
  assert.equal(events[0].type, "tool_result");
  assert.equal(outcome.kind, "done");
  assert.equal(outcome.kind === "done" && outcome.budget.steps, 2);
  assert.deepEqual(
    run.audit.map((entry) => [entry.decision, entry.outcome]),
    [["once", "ok"]],
  );
});

test("resume always runs like once (the caller records the grant)", async () => {
  const run = resume([
    { callId: "k1", decision: "always", argsDigest: pending.argsDigest },
  ]);
  await drain(runToolLoop(run.input));
  assert.equal(run.runs.length, 1);
  assert.equal(run.audit[0].decision, "always");
});

test("deny answers the call without running it", async () => {
  const run = resume([
    { callId: "k1", decision: "deny", argsDigest: pending.argsDigest },
  ]);
  await drain(runToolLoop(run.input));
  assert.equal(run.runs.length, 0);
  assert.deepEqual(run.inputs[0].toolTranscript[0].result, {
    ok: false,
    text: "error: denied_by_user",
  });
  assert.equal(run.audit[0].decision, "deny");
});

test("a decision with another args digest is rejected", async () => {
  const run = resume([
    { callId: "k1", decision: "once", argsDigest: "0".repeat(64) },
  ]);
  await drain(runToolLoop(run.input));
  assert.equal(run.runs.length, 0);
  assert.equal(
    run.inputs[0].toolTranscript[0].result.text,
    "error: approval_mismatch",
  );
  assert.equal(run.audit[0].decision, "rejected");
});

test("a decision for a call that was never stored runs nothing", async () => {
  const run = resume([
    { callId: "other", decision: "once", argsDigest: pending.argsDigest },
  ]);
  await drain(runToolLoop(run.input));
  assert.equal(run.runs.length, 0);
  assert.equal(run.inputs[0].toolTranscript.length, 1);
});

test("a stored call already in the transcript is not run again", async () => {
  const run = resume([
    { callId: "k1", decision: "once", argsDigest: pending.argsDigest },
  ]);
  run.input.transcript = [
    {
      call: { id: "k1", name: "ask", argsJson },
      result: { ok: true, text: "x" },
    },
  ];
  await drain(runToolLoop(run.input));
  assert.equal(run.runs.length, 0);
});
