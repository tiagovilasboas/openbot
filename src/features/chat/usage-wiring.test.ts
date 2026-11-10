import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import type { TokenUsage } from "../model/token-usage.ts";
import { fakeStreamResponse, ndjson } from "./fake-stream-response.ts";
import { parseStreamEvent } from "./stream-event-parser.ts";
import { requestModelStream } from "./request-model-stream.ts";

const { executeChatMessage } = await import("./execute-chat-message.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const bots = [...CREW_PRESETS] as BotProfile[];
const chief = bots.find((b) => b.id === "chief-of-staff") as BotProfile;
const other = bots.find((b) => b.id !== "chief-of-staff") as BotProfile;
const modelConfig: ClientModelConfig = {
  provider: "router",
  baseUrl: "https://router.test/v1",
  model: "vendor/m",
};

const delta = (text: string) => ({ type: "delta", text });
const done = (usage?: TokenUsage) => ({
  type: "done",
  provider: "stub",
  ...(usage ? { usage } : {}),
});

/** Scripted stream answers in order; plain /api/chat answers can carry usage. */
function stub(
  streams: string[][],
  plain: Array<{ text: string; usage?: TokenUsage }> = [],
) {
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    if (String(url) === "/api/chat/stream") {
      const next = streams.shift();
      if (!next) throw new Error("unexpected stream call");
      return fakeStreamResponse(next, init?.signal);
    }
    const reply = plain.shift();
    if (!reply) throw new Error("unexpected /api/chat call");
    return Response.json({ provider: "router", ...reply });
  }) as typeof fetch;
}

type Heard = Array<[string, TokenUsage | undefined]>;

function run(
  text: string,
  heard: Heard,
  overrides: Partial<Parameters<typeof executeChatMessage>[0]> = {},
) {
  return executeChatMessage({
    text,
    language: "en",
    history: [{ role: "user", text }],
    activeBot: other,
    bots,
    gitHubToken: null,
    modelConfig,
    onUsage: (botId, usage) => heard.push([botId, usage]),
    ...overrides,
  });
}

test("a streamed reply reports the done usage for the bot that answered", async () => {
  stub([[ndjson(delta("Hi"), done({ inputTokens: 12, outputTokens: 3 }))]]);
  const heard: Heard = [];
  await run("hello", heard, { onLive: () => undefined });
  assert.deepEqual(heard, [[other.id, { inputTokens: 12, outputTokens: 3 }]]);
});

test("a plain reply reports the usage from the route", async () => {
  stub([], [{ text: "ok", usage: { inputTokens: 8, outputTokens: 2 } }]);
  const heard: Heard = [];
  await run("hello", heard);
  assert.deepEqual(heard, [[other.id, { inputTokens: 8, outputTokens: 2 }]]);
});

test("a reply the provider gave no usage for is reported as unknown, not zero", async () => {
  stub([[ndjson(delta("Hi"), done())]], []);
  const heard: Heard = [];
  await run("hello", heard, { onLive: () => undefined });
  assert.deepEqual(heard, [[other.id, undefined]]);
});

test("a hostile usage from the route is sanitized before it is reported", async () => {
  stub(
    [],
    [{ text: "ok", usage: { inputTokens: -5, outputTokens: "9" } as never }],
  );
  const heard: Heard = [];
  await run("hello", heard);
  assert.deepEqual(heard, [[other.id, undefined]]);
});

test("a failed model call is not counted", async () => {
  globalThis.fetch = (async () =>
    Response.json({ error: "x" }, { status: 502 })) as typeof fetch;
  const heard: Heard = [];
  await run("hello", heard);
  assert.deepEqual(heard, []);
});

test("a reply cut off midway counts as a reply without usage data", async () => {
  stub([
    [
      ndjson(delta("Half"), {
        type: "error",
        code: "server",
        provider: "stub",
      }),
    ],
  ]);
  const heard: Heard = [];
  await run("hello", heard, { onLive: () => undefined });
  assert.deepEqual(heard, [[other.id, undefined]]);
});

test("specialists count for themselves and the synthesis for the Chief", async () => {
  stub([
    [
      ndjson(
        delta("On it.\n@delegate Engineering: check CI"),
        done({ inputTokens: 10, outputTokens: 1 }),
      ),
    ],
    [ndjson(delta("CI is green."), done({ inputTokens: 20, outputTokens: 2 }))],
    [ndjson(delta("All good."), done({ inputTokens: 30, outputTokens: 3 }))],
  ]);
  const heard: Heard = [];
  await run("How is CI?", heard, {
    activeBot: chief,
    mainBotId: chief.id,
    onLive: () => undefined,
  });
  assert.deepEqual(heard, [
    [chief.id, { inputTokens: 10, outputTokens: 1 }],
    ["engineering", { inputTokens: 20, outputTokens: 2 }],
    [chief.id, { inputTokens: 30, outputTokens: 3 }],
  ]);
});

test("a failing usage log never breaks the turn", async () => {
  stub([], [{ text: "ok", usage: { inputTokens: 1 } }]);
  const out = await run("hello", [], {
    onUsage: () => {
      throw new Error("disk full");
    },
  });
  assert.equal(out.text, "ok");
  assert.equal(out.modelCall, "ok");
});

test("the stream client reads usage from done and drops invalid counts", async () => {
  globalThis.fetch = (async () =>
    fakeStreamResponse([
      ndjson(delta("x"), done({ inputTokens: 4, outputTokens: 5 })),
    ])) as typeof fetch;
  const outcome = await requestModelStream("en", [], globalThis.fetch);
  assert.deepEqual(outcome, {
    kind: "text",
    text: "x",
    usage: { inputTokens: 4, outputTokens: 5 },
  });

  assert.deepEqual(
    parseStreamEvent(
      '{"type":"done","provider":"p","usage":{"inputTokens":-1,"outputTokens":7}}',
    ),
    { type: "done", provider: "p", usage: { outputTokens: 7 } },
  );
  assert.deepEqual(
    parseStreamEvent('{"type":"done","provider":"p","usage":"lots"}'),
    { type: "done", provider: "p" },
  );
});
