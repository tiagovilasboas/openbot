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
const chiefPreset = presets.find((b) => b.id === "chief-of-staff")!;
const engineering = presets.find((b) => b.id === "engineering")!;

type Sent = { modelId?: string; systemPrompt?: string };

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
  text = "hello there",
): ReturnType<typeof executeChatMessage> {
  return executeChatMessage({
    text,
    language: "en",
    history: [{ role: "user", text }],
    activeBot,
    bots,
    mainBotId: chiefPreset.id,
    gitHubToken: null,
    modelConfig,
  });
}

test("a chat call sends the active bot's modelId", async () => {
  const sent = stub(["hi"]);
  const bot = { ...engineering, modelId: "vendor/coder:free" };
  await run(bot, [bot]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.modelId, "vendor/coder:free");
});

test("a bot without a modelId sends none, so the global model applies", async () => {
  const sent = stub(["hi"]);
  await run(engineering, [engineering]);
  assert.ok(!("modelId" in sent[0]!));
});

test("a delegated specialist asks with its own modelId, the Chief with its own", async () => {
  const chief = { ...chiefPreset, modelId: "vendor/chief" };
  const specialist = { ...engineering, modelId: "vendor/spec" };
  const sent = stub([
    "@delegate Engineering: check the CI",
    "CI is green",
    "Final answer",
  ]);
  const out = await run(chief, [chief, specialist], "how is our CI?");
  assert.equal(out.text, "Final answer");
  assert.deepEqual(
    sent.map((call) => call.modelId),
    ["vendor/chief", "vendor/spec", "vendor/chief"],
  );
});

test("a specialist without a modelId does not inherit the Chief's", async () => {
  const chief = { ...chiefPreset, modelId: "vendor/chief" };
  const sent = stub([
    "@delegate Engineering: check the CI",
    "CI is green",
    "Final answer",
  ]);
  await run(chief, [chief, engineering], "how is our CI?");
  assert.equal(sent[1]?.modelId, undefined);
});
