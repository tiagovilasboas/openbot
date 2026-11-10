import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { fitHistoryToBytes } from "./request-history.ts";
import { requestModelReply } from "./request-model-reply.ts";

const { executeChatMessage } = await import("./execute-chat-message.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const modelConfig: ClientModelConfig = {
  provider: "router",
  baseUrl: "https://router.test/v1",
  model: "vendor/global",
};
const presets = [...CREW_PRESETS] as BotProfile[];
const chief = presets.find((b) => b.id === "chief-of-staff")!;
const engineering = presets.find((b) => b.id === "engineering")!;
const files = [{ name: "notes.txt", text: "Buy milk." }];

type Sent = {
  attachments?: unknown;
  messages?: Array<{ role: string; text: string }>;
};

function stub(replies: string[]): Sent[] {
  const sent: Sent[] = [];
  const queue = [...replies];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)));
    return Response.json({ provider: "router", text: queue.shift() ?? "ok" });
  }) as typeof fetch;
  return sent;
}

function run(
  activeBot: BotProfile,
  bots: BotProfile[],
  attachments?: typeof files,
) {
  return executeChatMessage({
    text: "what is in it?",
    language: "en",
    history: [{ role: "user", text: "what is in it?" }],
    activeBot,
    bots,
    mainBotId: chief.id,
    gitHubToken: null,
    modelConfig,
    memoryFor: () => [],
    attachments,
  });
}

test("the raw files travel in the chat request, not a built block", async () => {
  const sent = stub(["hi"]);
  await run(engineering, [engineering], files);
  assert.deepEqual(sent[0]?.attachments, files);
  assert.equal(sent[0]?.messages?.[0]?.text, "what is in it?");
});

test("a turn without files sends no attachments field", async () => {
  const sent = stub(["hi"]);
  await run(engineering, [engineering]);
  assert.ok(!("attachments" in sent[0]!));
});

test("a plain reply request carries the files too", async () => {
  const sent: Sent[] = [];
  const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)));
    return Response.json({ provider: "x", text: "ok" });
  }) as typeof fetch;
  await requestModelReply(
    "en",
    [{ role: "user", text: "hi" }],
    fetchImpl,
    null,
    undefined,
    { attachments: files },
  );
  assert.deepEqual(sent[0]?.attachments, files);
});

test("a delegated specialist is not sent the user's files", async () => {
  const sent = stub([
    "On it.\n@delegate Engineering: look at the notes",
    "specialist answer",
    "final",
  ]);
  await run(chief, presets, files);
  assert.ok(sent.length >= 2, `calls: ${sent.length}`);
  assert.deepEqual(sent[0]?.attachments, files);
  for (const call of sent.slice(1)) {
    assert.ok(!("attachments" in call));
  }
});

test("fitHistoryToBytes drops the oldest messages first", () => {
  const history = [
    { role: "user" as const, text: "a".repeat(100) },
    { role: "assistant" as const, text: "b".repeat(100) },
    { role: "user" as const, text: "c".repeat(100) },
    { role: "assistant" as const, text: "d".repeat(100) },
    { role: "user" as const, text: "e".repeat(100) },
  ];
  const fitted = fitHistoryToBytes(history, 300);
  // Whole history is ~600 bytes; the newest user turn is always kept and the
  // thread starts on a user message.
  assert.equal(fitted.at(-1)?.text, "e".repeat(100));
  assert.equal(fitted[0].role, "user");
  assert.ok(fitted.length < history.length);
});

test("fitHistoryToBytes keeps the turn's own message even when over budget", () => {
  const history = [{ role: "user" as const, text: "z".repeat(500) }];
  assert.deepEqual(fitHistoryToBytes(history, 10), history);
  assert.equal(fitHistoryToBytes(history, 100000).length, 1);
});
