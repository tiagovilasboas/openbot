import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { fakeStreamResponse, ndjson } from "./fake-stream-response.ts";
import type { LiveEntry } from "./live-board.ts";

const { executeChatMessage } = await import("./execute-chat-message.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const bots = [...CREW_PRESETS] as BotProfile[];
const chief = bots.find((b) => b.id === "chief-of-staff") as BotProfile;
const modelConfig: ClientModelConfig = {
  provider: "router",
  baseUrl: "https://router.test/v1",
  model: "vendor/m",
};

type Script = Array<string[] | { status: number }>;

/** Scripted /api/chat/stream answers, in order; /api/chat can be scripted too. */
function stubStream(script: Script, plain: string[] = []) {
  const urls: string[] = [];
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    urls.push(String(url));
    if (String(url) === "/api/chat/stream") {
      const next = script.shift();
      if (!next) throw new Error("unexpected stream call");
      return Array.isArray(next)
        ? fakeStreamResponse(next, init?.signal)
        : Response.json({ error: "x" }, { status: next.status });
    }
    const text = plain.shift();
    if (text === undefined) throw new Error("unexpected /api/chat call");
    return Response.json({ provider: "router", text });
  }) as typeof fetch;
  return urls;
}

const delta = (text: string) => ({ type: "delta", text });
const done = { type: "done", provider: "stub" };

function run(
  text: string,
  overrides: Partial<Parameters<typeof executeChatMessage>[0]> = {},
) {
  const snapshots: LiveEntry[][] = [];
  const result = executeChatMessage({
    text,
    language: "en",
    history: [{ role: "user", text }],
    activeBot: chief,
    bots,
    gitHubToken: null,
    modelConfig,
    onLive: (entries) => snapshots.push(entries.map((e) => ({ ...e }))),
    ...overrides,
  });
  return { result, snapshots };
}

test("a streamed reply grows live and finishes as the stored text", async () => {
  stubStream([[ndjson(delta("Hel"), delta("lo"), done)]]);
  const { result, snapshots } = run("hi");
  const out = await result;
  assert.equal(out.text, "Hello");
  assert.equal(out.modelCall, "ok");
  assert.equal(out.incomplete, undefined);
  assert.deepEqual(
    snapshots.map((s) => s[0]?.text),
    ["Hel", "Hello"],
  );
});

test("an error after some text keeps it as an incomplete reply", async () => {
  stubStream([
    [
      ndjson(delta("Half an answer"), {
        type: "error",
        code: "server",
        provider: "stub",
      }),
    ],
  ]);
  const out = await run("hi").result;
  assert.equal(out.text, "Half an answer");
  assert.equal(out.incomplete, "error");
  assert.equal(out.modelCall, "failed");
});

test("an error before any text uses the failure copy, as without streaming", async () => {
  stubStream([
    [ndjson({ type: "error", code: "auth", provider: "stub", status: 401 })],
  ]);
  const out = await run("hi").result;
  assert.match(out.text, /API key/i);
  assert.equal(out.incomplete, undefined);
  assert.equal(out.modelCall, "failed");
});

test("a cancel keeps the text and is not a failed model call", async () => {
  const user = new AbortController();
  stubStream([[ndjson(delta("Partway")), "stall"]]);
  const { result } = run("hi", { signal: user.signal });
  setTimeout(() => user.abort(), 10);
  const out = await result;
  assert.equal(out.text, "Partway");
  assert.equal(out.incomplete, "cancelled");
  assert.equal(out.modelCall, undefined);
});

test("an unreachable stream route falls back to the plain route", async () => {
  const urls = stubStream([{ status: 503 }], ["plain reply"]);
  const out = await run("hi").result;
  assert.equal(out.text, "plain reply");
  assert.deepEqual(urls, ["/api/chat/stream", "/api/chat"]);
});

test("without onLive the plain route is used and nothing streams", async () => {
  const urls = stubStream([], ["plain reply"]);
  const out = await run("hi", { onLive: undefined }).result;
  assert.equal(out.text, "plain reply");
  assert.deepEqual(urls, ["/api/chat"]);
});

test("the Chief's delegation line never shows while it streams", async () => {
  stubStream([
    [ndjson(delta("On it.\n@dele"), delta("gate Engineering: check CI"), done)],
    [ndjson(delta("CI is green."), done)],
    [ndjson(delta("All good: "), delta("CI is healthy."), done)],
  ]);
  const { result, snapshots } = run("How is CI?", {
    mainBotId: "chief-of-staff",
  });
  const out = await result;

  const shown = snapshots.flat().map((e) => e.text);
  assert.ok(shown.every((text) => !text.includes("@dele")));
  assert.equal(out.text, "All good: CI is healthy.");
  assert.equal(out.crew?.specialists[0]?.text, "CI is green.");
  assert.match(out.crew?.kickoff ?? "", /On it\./);

  // Kickoff stays, the specialist streams then stays, the synthesis streams.
  const last = snapshots.at(-1) ?? [];
  assert.equal(last.length, 3);
  assert.equal(last[1]?.delegatedBot?.id, "engineering");
  assert.equal(last[2]?.text, "All good: CI is healthy.");
});

test("a cancel during a specialist leaves the finished entries in place", async () => {
  const user = new AbortController();
  stubStream([
    [ndjson(delta("@delegate Engineering: check"), done)],
    [ndjson(delta("Looking")), "stall"],
  ]);
  const { result, snapshots } = run("How is CI?", {
    mainBotId: "chief-of-staff",
    signal: user.signal,
  });
  setTimeout(() => user.abort(), 30);
  await result;
  const seen = snapshots.map((entries) => entries.map((e) => e.text));
  const whileLooking = seen.find((texts) => texts.includes("Looking"));
  assert.ok(whileLooking, "the specialist's partial text was shown");
  assert.ok(whileLooking[0]?.includes("Delegating"), "the kickoff stayed");
});
