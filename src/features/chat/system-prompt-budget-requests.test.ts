import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { MAX_SYSTEM_PROMPT_CHARS } from "../model/system-prompt-limit.ts";
import { parseChatRequest } from "../model/parse-chat-request.ts";

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
const baseChief = presets.find((b) => b.id === "chief-of-staff")!;
const crew = presets.filter((b) => b.id !== "chief-of-staff");
// A Chief whose own text is long enough to have pushed the roster out before.
const bigChief: BotProfile = {
  ...baseChief,
  description: "You lead. ".repeat(500),
  workspaceContext: "Context. ".repeat(900),
};

test("a long Chief still sends the team roster and passes the server", async () => {
  const prompts: string[] = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    prompts.push(body.systemPrompt);
    // What the real route does with the body before any model call.
    assert.ok(parseChatRequest(body).ok, "the server refused the request");
    return Response.json({ provider: "router", text: "ok" });
  }) as typeof fetch;

  await executeChatMessage({
    text: "hello",
    language: "en",
    history: [{ role: "user", text: "hello" }],
    activeBot: bigChief,
    bots: [bigChief, ...crew],
    mainBotId: bigChief.id,
    gitHubToken: null,
    modelConfig,
  });

  const prompt = prompts[0] ?? "";
  assert.ok(prompt.length <= MAX_SYSTEM_PROMPT_CHARS);
  for (const member of crew.slice(0, 3)) {
    assert.ok(prompt.includes(member.name), `${member.name} is missing`);
  }
  assert.match(prompt, /@delegate/i, "the delegation rules were cut off");
});
