import assert from "node:assert/strict";
import test from "node:test";
import { runToolLoop } from "./run-tool-loop.ts";
import { createAskUserTool } from "./server/ask-user-tool.ts";
import type { PendingCall, ResumeDecision } from "./tool-loop-types.ts";
import { drain, loopInput, scriptedStep, sha } from "./tool-loop-fixtures.ts";

const args = { question: "Tea or coffee?", options: ["Tea", "Coffee"] };
const argsJson = JSON.stringify(args);
const stored: PendingCall = {
  callId: "q1",
  name: "ask_user",
  argsJson,
  argsDigest: sha(argsJson),
  preview: "ask_user",
};

test("ask_user pauses the turn even at its default allow level", async () => {
  const { step } = scriptedStep([
    { calls: [{ id: "q1", name: "ask_user", args }] },
  ]);
  const { input } = loopInput([createAskUserTool()], step);
  const { events, outcome } = await drain(runToolLoop(input));
  assert.equal(outcome.kind, "approval_required");
  assert.equal(
    outcome.kind === "approval_required" && outcome.pendingCalls[0].callId,
    "q1",
  );
  const call = events.find((event) => event.type === "tool_call");
  assert.equal(call?.type === "tool_call" && call.policy, "ask");
});

test("invalid ask_user args go back to the model as bad_args", async () => {
  const { step, inputs } = scriptedStep([
    { calls: [{ id: "q1", name: "ask_user", args: { question: "Q" } }] },
    { text: "ok" },
  ]);
  const { input } = loopInput([createAskUserTool()], step);
  const { outcome } = await drain(runToolLoop(input));
  assert.equal(outcome.kind, "done");
  assert.equal(inputs[1].toolTranscript[0].result.text, "error: bad_args");
});

test("a blocked ask_user is not offered", async () => {
  const { step, inputs } = scriptedStep([{ text: "hi" }]);
  const { input } = loopInput([createAskUserTool()], step, {
    levels: { ask_user: "block" },
  });
  await drain(runToolLoop(input));
  assert.equal(inputs[0].tools, undefined);
});

function resumeWith(decision: ResumeDecision) {
  const { step, inputs } = scriptedStep([{ text: "final" }]);
  const { input, audit } = loopInput([createAskUserTool()], step, {
    budget: { steps: 1, calls: 1, resultChars: 0 },
    resume: { pendingCalls: [stored], decisions: [decision] },
  });
  return { input, audit, inputs };
}

test("the user's answer becomes the result and the turn continues", async () => {
  const run = resumeWith({
    callId: "q1",
    decision: "once",
    argsDigest: stored.argsDigest,
    answer: { kind: "option", index: 1 },
  });
  const { events, outcome } = await drain(runToolLoop(run.input));
  assert.equal(outcome.kind, "done");
  const result = run.inputs[0].toolTranscript[0].result;
  assert.equal(result.ok, true);
  assert.match(result.text, /"answer":"Coffee"/);
  const shown = events.find((event) => event.type === "tool_result");
  assert.equal(shown?.type === "tool_result" && shown.preview, "Coffee");
  assert.deepEqual(
    run.audit.map((entry) => [entry.decision, entry.outcome]),
    [["once", "ok"]],
  );
});

test("an answer that does not fit the stored question is refused", async () => {
  const run = resumeWith({
    callId: "q1",
    decision: "once",
    argsDigest: stored.argsDigest,
    answer: { kind: "text", text: "Water" },
  });
  await drain(runToolLoop(run.input));
  assert.equal(
    run.inputs[0].toolTranscript[0].result.text,
    "error: bad_answer",
  );
});

test("a skipped question answers the model with denied_by_user", async () => {
  const run = resumeWith({
    callId: "q1",
    decision: "deny",
    argsDigest: stored.argsDigest,
  });
  await drain(runToolLoop(run.input));
  assert.equal(
    run.inputs[0].toolTranscript[0].result.text,
    "error: denied_by_user",
  );
});
