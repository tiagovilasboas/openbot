import assert from "node:assert/strict";
import test from "node:test";
import { parseTurnEvent } from "../../chat/stream-event-parser.ts";
import { parseToolEvent, TOOL_PREVIEW_MAX } from "./tool-stream-events.ts";

const TURN = "0f8e6c2a-1b2c-4d5e-8f90-123456789abc";
const DIGEST = "a".repeat(64);
const call = {
  callId: "c1",
  name: "memory_add_note",
  preview: "likes tea",
  argsDigest: DIGEST,
  allowAlways: true,
};

test("tool_call and tool_result are read field by field", () => {
  assert.deepEqual(
    parseToolEvent({
      type: "tool_call",
      callId: "c1",
      name: "github_read",
      preview: "repo",
      policy: "auto",
      extra: "dropped",
    }),
    {
      type: "tool_call",
      callId: "c1",
      name: "github_read",
      preview: "repo",
      policy: "auto",
    },
  );
  assert.deepEqual(
    parseToolEvent({ type: "tool_result", callId: "c1", ok: false }),
    { type: "tool_result", callId: "c1", ok: false, preview: "" },
  );
});

test("a malformed tool event is dropped", () => {
  for (const bad of [
    { type: "tool_call", callId: "c1", name: "x", policy: "never" },
    { type: "tool_call", callId: "", name: "x", policy: "auto" },
    { type: "tool_call", callId: "c".repeat(65), name: "x", policy: "auto" },
    { type: "tool_result", callId: "c1", ok: "yes" },
    { type: "tool_result", ok: true },
    { type: "unknown_tool_event" },
  ]) {
    assert.equal(parseToolEvent(bad), null, JSON.stringify(bad));
  }
});

test("a long preview is cut to the preview cap", () => {
  const event = parseToolEvent({
    type: "tool_result",
    callId: "c1",
    ok: true,
    preview: "x".repeat(TOOL_PREVIEW_MAX + 50),
  });
  assert.ok(event?.type === "tool_result");
  assert.equal(event.preview.length, TOOL_PREVIEW_MAX);
});

test("approval_required keeps the turn, its calls and the expiry", () => {
  assert.deepEqual(
    parseToolEvent({
      type: "approval_required",
      turnId: TURN,
      calls: [call],
      expiresAt: 1000,
    }),
    { type: "approval_required", turnId: TURN, calls: [call], expiresAt: 1000 },
  );
  const notAlways = parseToolEvent({
    type: "approval_required",
    turnId: TURN,
    calls: [{ ...call, allowAlways: "true" }],
    expiresAt: 1000,
  });
  assert.ok(notAlways?.type === "approval_required");
  assert.equal(notAlways.calls[0].allowAlways, false);
});

test("approval_required with a bad turn, digest, expiry or call list is dropped", () => {
  const base = { type: "approval_required", turnId: TURN, expiresAt: 1000 };
  for (const bad of [
    { ...base, calls: [call], turnId: "not-a-turn" },
    { ...base, calls: [call], expiresAt: "soon" },
    { ...base, calls: [call], expiresAt: Number.POSITIVE_INFINITY },
    { ...base, calls: [] },
    { ...base, calls: [call, call, call, call] },
    { ...base, calls: [{ ...call, argsDigest: "short" }] },
    { ...base, calls: [{ ...call, name: undefined }] },
    { ...base, calls: [null] },
  ]) {
    assert.equal(parseToolEvent(bad), null, JSON.stringify(bad));
  }
});

test("the turn parser reads text events and tool events from one stream", () => {
  assert.deepEqual(parseTurnEvent('{"type":"delta","text":"hi"}'), {
    type: "delta",
    text: "hi",
  });
  assert.deepEqual(parseTurnEvent('{"type":"memory_changed"}'), {
    type: "memory_changed",
  });
  assert.deepEqual(parseTurnEvent('{"type":"tools_unavailable"}'), {
    type: "tools_unavailable",
  });
  assert.equal(parseTurnEvent("not json"), null);
  assert.equal(parseTurnEvent('{"type":"tool_call"}'), null);
});
