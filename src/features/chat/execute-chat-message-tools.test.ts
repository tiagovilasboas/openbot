import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { BotProfile } from "../bots/bot-types.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { fakeStreamResponse, ndjson } from "./fake-stream-response.ts";

const { executeChatMessage } = await import("./execute-chat-message.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const modelConfig: ClientModelConfig = {
  provider: "router",
  baseUrl: "https://router.test/v1",
  model: "vendor/m",
};
const bot = (id: string, toolsEnabled?: boolean): BotProfile =>
  ({
    id,
    name: id,
    description: "d",
    avatarShape: "hexagon",
    avatarColor: "cyan",
    skills: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...(toolsEnabled === undefined ? {} : { toolsEnabled }),
  }) as BotProfile;

/** Every streamed route answers one short reply; the URLs are recorded. */
function stubRoutes() {
  const sent: { url: string; body: Record<string, unknown> }[] = [];
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return fakeStreamResponse([
      ndjson({ type: "delta", text: "ok" }, { type: "done", provider: "stub" }),
    ]);
  }) as typeof fetch;
  return sent;
}

async function send(activeBot: BotProfile, mainBotId: string) {
  return executeChatMessage({
    text: "hello",
    language: "en",
    history: [{ role: "user", text: "hello" }],
    activeBot,
    bots: [activeBot],
    mainBotId,
    gitHubToken: null,
    modelConfig,
    onLive: () => undefined,
  });
}

test("a single bot that opted in sends its turn to the tool route", async () => {
  const sent = stubRoutes();
  const reply = await send(bot("helper", true), "chief");
  assert.equal(reply.text, "ok");
  assert.deepEqual(
    sent.map((request) => request.url),
    ["/api/chat/tools"],
  );
  assert.equal(sent[0].body.botId, "helper");
  assert.equal(sent[0].body.toolsEnabled, true);
});

test("a bot that did not opt in keeps the plain stream route", async () => {
  const sent = stubRoutes();
  await send(bot("helper"), "chief");
  assert.deepEqual(
    sent.map((request) => request.url),
    ["/api/chat/stream"],
  );
  assert.equal("toolsEnabled" in sent[0].body, false);
});

test("the Chief never takes the tool route, even when opted in", async () => {
  const sent = stubRoutes();
  await send(bot("chief", true), "chief");
  assert.ok(sent.every((request) => request.url === "/api/chat/stream"));
  assert.ok(sent.every((request) => !("toolsEnabled" in request.body)));
});
