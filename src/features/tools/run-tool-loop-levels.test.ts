import assert from "node:assert/strict";
import test from "node:test";
import { runToolLoop } from "./run-tool-loop.ts";
import type { PendingCall } from "./tool-loop-types.ts";
import {
  drain,
  fakeTool,
  loopInput,
  scriptedStep,
  sha,
} from "./tool-loop-fixtures.ts";

test("a blocked tool is left out of the offer", async () => {
  const { step, inputs } = scriptedStep([{ text: "hi" }]);
  const open = fakeTool({ name: "open" });
  const shut = fakeTool({ name: "shut" });
  const { input } = loopInput([open.tool, shut.tool], step, {
    levels: { shut: "block" },
  });
  await drain(runToolLoop(input));
  assert.deepEqual(
    inputs[0].tools?.map((spec) => spec.name),
    ["open"],
  );
});

test("no tools are offered when every tool is blocked", async () => {
  const { step, inputs } = scriptedStep([{ text: "hi" }]);
  const shut = fakeTool({ name: "shut" });
  const { input } = loopInput([shut.tool], step, { levels: { shut: "block" } });
  await drain(runToolLoop(input));
  assert.equal(inputs[0].tools, undefined);
});

test("a call to a blocked tool is refused and never runs, grant or not", async () => {
  const { step, inputs } = scriptedStep([
    { calls: [{ id: "c1", name: "note", args: { text: "x" } }] },
    { text: "ok" },
  ]);
  const note = fakeTool({ name: "note", policy: "ask", allowAlways: true });
  const { input, audit } = loopInput([note.tool], step, {
    grants: [{ botId: "bot_1", toolName: "note" }],
    levels: { note: "block" },
  });
  const { outcome } = await drain(runToolLoop(input));
  assert.deepEqual(note.runs, []);
  assert.equal(inputs[1].toolTranscript[0].result.text, "error: tool_blocked");
  assert.deepEqual(
    audit.map((entry) => [entry.decision, entry.outcome]),
    [["rejected", "tool_blocked"]],
  );
  assert.equal(outcome.kind, "done");
});

test("allow runs an opted-in ask tool without asking", async () => {
  const { step } = scriptedStep([
    { calls: [{ id: "c1", name: "note", args: { text: "x" } }] },
    { text: "ok" },
  ]);
  const note = fakeTool({ name: "note", policy: "ask", allowAlways: true });
  const { input, audit } = loopInput([note.tool], step, {
    levels: { note: "allow" },
  });
  const { outcome } = await drain(runToolLoop(input));
  assert.equal(outcome.kind, "done");
  assert.equal(note.runs.length, 1);
  assert.equal(audit[0].decision, "auto");
});

test("allow on a tool without allowAlways still asks", async () => {
  const { step } = scriptedStep([
    { calls: [{ id: "c1", name: "send", args: {} }] },
  ]);
  const send = fakeTool({ name: "send", policy: "ask", allowAlways: false });
  const { input } = loopInput([send.tool], step, { levels: { send: "allow" } });
  const { outcome } = await drain(runToolLoop(input));
  assert.equal(outcome.kind, "approval_required");
  assert.deepEqual(send.runs, []);
});

test("a tool blocked while a call waits is refused on resume, even if approved", async () => {
  const argsJson = '{"text":"remember"}';
  const pending: PendingCall = {
    callId: "k1",
    name: "note",
    argsJson,
    argsDigest: sha(argsJson),
    preview: "note",
  };
  const { step, inputs } = scriptedStep([{ text: "final" }]);
  const note = fakeTool({ name: "note", policy: "ask", allowAlways: true });
  const { input } = loopInput([note.tool], step, {
    budget: { steps: 1, calls: 1, resultChars: 0 },
    levels: { note: "block" },
    resume: {
      pendingCalls: [pending],
      decisions: [
        { callId: "k1", decision: "once", argsDigest: pending.argsDigest },
      ],
    },
  });
  await drain(runToolLoop(input));
  assert.deepEqual(note.runs, []);
  assert.equal(inputs[0].toolTranscript[0].result.text, "error: tool_blocked");
});
