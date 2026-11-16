import assert from "node:assert/strict";
import test from "node:test";
import {
  decisionsFor,
  judgeApprovalPause,
  judgeApprovedResume,
  judgeDeniedResume,
  judgeLookupTurn,
  noteCount,
  parseNdjson,
  summarizeTurn,
} from "./tool-run-events.mjs";

const lines = (...events) => events.map((e) => JSON.stringify(e)).join("\n");
const DIGEST = "a".repeat(64);
const approval = {
  type: "approval_required",
  turnId: "t",
  expiresAt: 1,
  calls: [{ callId: "c1", name: "memory_add_note", argsDigest: DIGEST }],
};

test("parseNdjson skips blank and torn lines", () => {
  const text = `${lines({ type: "delta", text: "a" })}\n\n{"type":\n`;
  assert.deepEqual(parseNdjson(text), [{ type: "delta", text: "a" }]);
});

test("summarizeTurn flattens text, calls, failover and the end event", () => {
  const s = summarizeTurn(
    parseNdjson(
      lines(
        {
          type: "tool_call",
          callId: "c",
          name: "x",
          preview: "p",
          policy: "auto",
        },
        { type: "tool_result", callId: "c", ok: true, preview: "r" },
        { type: "delta", text: "he" },
        { type: "delta", text: "llo" },
        { type: "memory_changed" },
        {
          type: "done",
          provider: "router",
          model: "m",
          failover: { fromModel: "a", toModel: "b", reason: "rate" },
        },
      ),
    ),
  );
  assert.equal(s.text, "hello");
  assert.equal(s.end, "done");
  assert.equal(s.failover, "a -> b (rate)");
  assert.equal(s.memoryChanged, true);
  assert.equal(s.toolCalls[0].name, "x");
});

test("lookup turn reasons: unavailable, no call, failed tool, no text", () => {
  const judge = (...e) => judgeLookupTurn(summarizeTurn(e), "x");
  const call = { type: "tool_call", name: "x", policy: "auto", preview: "" };
  const ok = { type: "tool_result", ok: true, preview: "" };
  const done = { type: "done", provider: "r" };
  assert.equal(
    judge({ type: "tools_unavailable" }, done).reason,
    "tools_unavailable",
  );
  assert.equal(
    judge({ type: "delta", text: "hi" }, done).reason,
    "no_tool_call",
  );
  assert.equal(
    judge(call, { type: "tool_result", ok: false, preview: "" }, done).reason,
    "tool_failed",
  );
  assert.equal(judge(call, ok, done).reason, "no_final_text");
  assert.equal(judge(call, ok, { type: "delta", text: "t" }, done).ok, true);
  assert.equal(
    judge({ type: "error", code: "rate_limited", provider: "r" }).reason,
    "model_error:rate_limited",
  );
});

test("approval pause needs the right tool; decisions echo the digest", () => {
  const s = summarizeTurn([approval]);
  assert.equal(judgeApprovalPause(s, "memory_add_note").ok, true);
  assert.equal(
    judgeApprovalPause(s, "other").reason,
    "approval_for_wrong_tool",
  );
  assert.equal(
    judgeApprovalPause(summarizeTurn([{ type: "done" }]), "x").reason,
    "no_approval_required",
  );
  assert.deepEqual(decisionsFor(s.approval, "once"), [
    { callId: "c1", decision: "once", argsDigest: DIGEST },
  ]);
});

test("resume judgements: once must run the tool, deny must not", () => {
  const ran = [
    { type: "tool_result", ok: true, preview: "" },
    { type: "delta", text: "saved" },
    { type: "done" },
  ];
  assert.equal(judgeApprovedResume(summarizeTurn(ran)).ok, true);
  assert.equal(
    judgeApprovedResume(summarizeTurn([{ type: "done" }])).reason,
    "tool_not_run",
  );
  assert.equal(
    judgeDeniedResume(summarizeTurn(ran)).reason,
    "tool_ran_after_deny",
  );
  assert.equal(judgeDeniedResume(summarizeTurn([{ type: "done" }])).ok, true);
});

test("noteCount reads entries and flags a bad body", () => {
  assert.equal(noteCount({ entries: [{}, {}] }), 2);
  assert.equal(noteCount({}), -1);
});
