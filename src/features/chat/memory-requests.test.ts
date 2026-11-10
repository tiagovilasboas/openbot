import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import type { ClientModelConfig } from "../model/model-config.ts";

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

type Sent = { memory?: string[]; systemPrompt?: string };

function stub(replies: string[]): Sent[] {
  const sent: Sent[] = [];
  const queue = [...replies];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)));
    return Response.json({ provider: "router", text: queue.shift() ?? "ok" });
  }) as typeof fetch;
  return sent;
}

const notes: Record<string, string[]> = {
  "chief-of-staff": ["chief note"],
  engineering: ["engineering note"],
};
const memoryFor = (botId: string) => notes[botId] ?? [];

function run(activeBot: BotProfile, bots: BotProfile[], text = "hello") {
  return executeChatMessage({
    text,
    language: "en",
    history: [{ role: "user", text }],
    activeBot,
    bots,
    mainBotId: chief.id,
    gitHubToken: null,
    modelConfig,
    memoryFor,
  });
}

test("a chat call sends the raw notes of the bot that answers", async () => {
  const sent = stub(["hi"]);
  await run(engineering, [engineering]);
  assert.deepEqual(sent[0]?.memory, ["engineering note"]);
  // The client does not build the block: the server does.
  assert.ok(!sent[0]?.systemPrompt?.includes("engineering note"));
});

test("a bot without notes sends no memory field", async () => {
  const sent = stub(["hi"]);
  const bare = { ...engineering, id: "bare" };
  await run(bare, [bare]);
  assert.ok(!("memory" in sent[0]!));
});

test("specialists use their own memory and the synthesis the Chief's", async () => {
  const sent = stub([
    "@delegate Engineering: check the CI",
    "CI is green",
    "Final answer",
  ]);
  const out = await run(chief, [chief, engineering], "how is our CI?");
  assert.equal(out.text, "Final answer");
  assert.deepEqual(
    sent.map((call) => call.memory),
    [["chief note"], ["engineering note"], ["chief note"]],
  );
});
