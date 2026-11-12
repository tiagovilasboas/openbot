import assert from "node:assert/strict";
import test from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import { fakeStreamResponse, ndjson } from "./fake-stream-response.ts";
import type { MessageData } from "./ChatMessageItem.tsx";

const { streamToolTurn } = await import("./tool-turn-reply.ts");
const { settleToolReply } = await import("./tool-reply-message.ts");
const { toolsCopy } = await import("../tools/client/tools-copy.ts");

const TURN = "0f8e6c2a-1b2c-4d5e-8f90-123456789abc";
const DIGEST = "a".repeat(64);
const request = {
  language: "en" as const,
  messages: [{ role: "user" as const, text: "remember I like tea" }],
  config: null,
  systemPrompt: "You are b1.",
};
const approval = {
  type: "approval_required",
  turnId: TURN,
  expiresAt: 9_000,
  calls: [
    {
      callId: "c1",
      name: "memory_add_note",
      preview: "likes tea",
      argsDigest: DIGEST,
      allowAlways: true,
    },
  ],
};
const delta = (text: string) => ({ type: "delta", text });
const done = { type: "done", provider: "stub" };

type Sent = { url: string; body: Record<string, unknown> };

/** Answers each request with the next scripted response, recording it. */
function scripted(...responses: Array<() => Response>) {
  const sent: Sent[] = [];
  const fetchImpl = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected request to ${String(url)}`);
    return next();
  }) as typeof fetch;
  return { sent, fetchImpl };
}

const stream =
  (...events: object[]) =>
  () =>
    fakeStreamResponse([ndjson(...events)]);
const status = (code: number) => () =>
  Response.json({ error: "x" }, { status: code });

test("an opted-in turn goes to the tool route and pauses for approval", async () => {
  const { sent, fetchImpl } = scripted(
    stream(
      delta("Let me save that."),
      {
        type: "tool_call",
        callId: "c1",
        name: "memory_add_note",
        preview: "likes tea",
        policy: "ask",
      },
      approval,
    ),
  );
  const result = await streamToolTurn({
    request,
    tools: { botId: "b1" },
    onMemoryChanged: () => undefined,
    fetchImpl,
  });
  assert.equal(sent[0].url, "/api/chat/tools");
  assert.equal(sent[0].body.botId, "b1");
  assert.equal(sent[0].body.toolsEnabled, true);
  assert.deepEqual(sent[0].body.messages, request.messages);
  const pause = result.reply.toolPause;
  assert.ok(pause);
  assert.equal(pause.pause.turnId, TURN);
  assert.equal(pause.request, request);
  assert.equal(pause.text, "Let me save that.");
  assert.deepEqual(
    pause.steps.map((step) => step.status),
    ["pending"],
  );
  // What a reload would find: the waiting call cannot outlive the page.
  assert.deepEqual(result.reply.toolSteps, [
    { name: "memory_add_note", status: "expired", summary: "likes tea" },
  ]);
});

test("a resume sends the same messages plus the decisions and continues the text", async () => {
  const memory: string[] = [];
  const { sent, fetchImpl } = scripted(
    stream(
      { type: "tool_result", callId: "c1", ok: true, preview: "saved" },
      { type: "memory_changed" },
      delta("Saved."),
      done,
    ),
  );
  const decisions = [
    { callId: "c1", decision: "once" as const, argsDigest: DIGEST },
  ];
  const result = await streamToolTurn({
    request,
    tools: { botId: "b1", resume: { turnId: TURN, decisions } },
    prior: {
      text: "Let me save that.",
      steps: [
        {
          callId: "c1",
          name: "memory_add_note",
          status: "pending",
          summary: "likes tea",
        },
      ],
    },
    onMemoryChanged: (botId) => memory.push(botId),
    fetchImpl,
  });
  assert.equal(sent[0].url, "/api/chat/tools");
  assert.deepEqual(sent[0].body.messages, request.messages);
  assert.equal(sent[0].body.systemPrompt, request.systemPrompt);
  assert.deepEqual(sent[0].body.resume, { turnId: TURN, decisions });
  assert.deepEqual(memory, ["b1"]);
  assert.equal(result.reply.text, "Let me save that.\n\nSaved.");
  assert.deepEqual(result.reply.toolSteps, [
    { name: "memory_add_note", status: "ok", summary: "saved" },
  ]);
  assert.equal(result.reply.toolPause, undefined);
});

for (const code of [404, 409, 410]) {
  test(`a resume refused with ${code} expires the waiting steps and keeps the text`, async () => {
    const { sent, fetchImpl } = scripted(status(code));
    const result = await streamToolTurn({
      request,
      tools: {
        botId: "b1",
        resume: {
          turnId: TURN,
          decisions: [{ callId: "c1", decision: "deny", argsDigest: DIGEST }],
        },
      },
      prior: {
        text: "Let me save that.",
        steps: [
          {
            callId: "c1",
            name: "memory_add_note",
            status: "pending",
            summary: "likes tea",
          },
        ],
      },
      onMemoryChanged: () => undefined,
      fetchImpl,
    });
    // Never sent anywhere else: a resume is bound to the paused turn.
    assert.deepEqual(
      sent.map((request) => request.url),
      ["/api/chat/tools"],
    );
    assert.equal(result.produced, false);
    assert.equal(result.reply.text, "Let me save that.");
    assert.deepEqual(result.reply.toolSteps, [
      { name: "memory_add_note", status: "expired", summary: "likes tea" },
    ]);
  });
}

test("a refused resume with no text so far reads as the expiry note", async () => {
  const { fetchImpl } = scripted(status(410));
  const result = await streamToolTurn({
    request,
    tools: { botId: "b1", resume: { turnId: TURN, decisions: [] } },
    prior: { text: "", steps: [] },
    onMemoryChanged: () => undefined,
    fetchImpl,
  });
  assert.equal(result.reply.text, toolsCopy.en.expiredNote);
});

test("a resume that cannot be reached fails without falling back", async () => {
  const { sent, fetchImpl } = scripted(() => {
    throw new TypeError("Failed to fetch");
  });
  const result = await streamToolTurn({
    request,
    tools: { botId: "b1", resume: { turnId: TURN, decisions: [] } },
    prior: { text: "Before.", steps: [] },
    onMemoryChanged: () => undefined,
    fetchImpl,
  });
  assert.equal(sent.length, 1);
  assert.equal(result.reply.text, "Before.");
  assert.ok(result.reply.incomplete);
});

test("tools_unavailable is reported and the turn answers as plain chat", async () => {
  const { fetchImpl } = scripted(
    stream({ type: "tools_unavailable" }, delta("Plain answer."), done),
  );
  const result = await streamToolTurn({
    request,
    tools: { botId: "b1" },
    onMemoryChanged: () => undefined,
    fetchImpl,
  });
  assert.equal(result.reply.text, "Plain answer.");
  assert.equal(result.reply.toolsUnavailable, true);
  assert.equal(result.reply.toolSteps, undefined);
});

test("a settled resume replaces the paused message's text and steps", () => {
  const thread: MessageData[] = [
    { id: 1, role: "user", language: "en", text: "hi" },
    {
      id: 2,
      role: "assistant",
      language: "en",
      text: "Let me save that.",
      incomplete: "cancelled",
      toolSteps: [{ name: "memory_add_note", status: "expired", summary: "" }],
    },
  ];
  const next = settleToolReply(thread, 2, {
    text: "Let me save that.\n\nSaved.",
    toolSteps: [{ name: "memory_add_note", status: "ok", summary: "saved" }],
  });
  assert.deepEqual(next[0], thread[0]);
  assert.deepEqual(next[1], {
    id: 2,
    role: "assistant",
    language: "en",
    text: "Let me save that.\n\nSaved.",
    toolSteps: [{ name: "memory_add_note", status: "ok", summary: "saved" }],
  });
  assert.deepEqual(settleToolReply(thread, 99, { text: "x" }), thread);
});
