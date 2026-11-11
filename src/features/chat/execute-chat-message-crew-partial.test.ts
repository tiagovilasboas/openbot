import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { fakeStreamResponse, ndjson } from "./fake-stream-response.ts";
import { canRetryIncomplete } from "./incomplete-reply.ts";
import type { LiveEntry } from "./live-board.ts";
import { buildReplyMessages } from "./reply-messages.ts";

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

type Script = Array<Array<string>>;

/** Scripted /api/chat/stream answers; the request bodies are recorded. */
function stubStream(script: Script) {
  const bodies: Array<{ messages: Array<{ text: string }> }> = [];
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    assert.equal(String(url), "/api/chat/stream");
    bodies.push(JSON.parse(String(init?.body)));
    const next = script.shift();
    if (!next) throw new Error("unexpected stream call");
    return fakeStreamResponse(next, init?.signal);
  }) as typeof fetch;
  return bodies;
}

const delta = (text: string) => ({ type: "delta", text });
const done = { type: "done", provider: "stub" };
const broken = (code: string) => ({ type: "error", code, provider: "stub" });

function run(
  overrides: Partial<Parameters<typeof executeChatMessage>[0]> = {},
) {
  const snapshots: LiveEntry[][] = [];
  const result = executeChatMessage({
    text: "How is CI?",
    language: "en",
    history: [{ role: "user", text: "How is CI?" }],
    activeBot: chief,
    bots,
    mainBotId: "chief-of-staff",
    gitHubToken: null,
    modelConfig,
    onLive: (entries) => snapshots.push(entries.map((e) => ({ ...e }))),
    ...overrides,
  });
  return { result, snapshots };
}

const kickoff = ndjson(delta("@delegate Engineering: check CI"), done);

test("a specialist cut midway keeps its text, marked incomplete, and the synthesis runs", async () => {
  const bodies = stubStream([
    [kickoff],
    [ndjson(delta("CI is gre"), broken("server"))],
    [ndjson(delta("CI looks fine, one part is missing."), done)],
  ]);
  const { result, snapshots } = run();
  const out = await result;

  const step = out.crew?.specialists[0];
  assert.equal(step?.text, "CI is gre");
  assert.equal(step?.step?.ok, true);
  assert.equal(step?.step?.incomplete, "error");
  assert.equal(out.text, "CI looks fine, one part is missing.");
  assert.equal(out.incomplete, undefined);
  assert.equal(out.modelCall, "ok");

  // The Chief was told the part was cut, and the text stayed wrapped as data.
  const report = bodies[2]?.messages.at(-1)?.text ?? "";
  assert.match(report, /<external-data>\nCI is gre\n<\/external-data>/);
  assert.match(report, /cut off midway/);

  // The cut reply stays on screen next to the synthesis.
  const last = snapshots.at(-1) ?? [];
  assert.equal(last.length, 3);
  assert.equal(last[1]?.text, "CI is gre");

  let id = 0;
  const messages = buildReplyMessages(out, {
    language: "en",
    nextId: () => ++id,
  });
  assert.equal(messages[1]?.incomplete, "error");
  assert.equal(messages[1]?.crewStep?.incomplete, "error");
  assert.equal(messages[2]?.incomplete, undefined);
});

test("a synthesis cut midway is the reply, marked incomplete", async () => {
  stubStream([
    [kickoff],
    [ndjson(delta("CI is green."), done)],
    [ndjson(delta("Overall CI is"), broken("server"))],
  ]);
  const out = await run().result;
  assert.equal(out.text, "Overall CI is");
  assert.equal(out.incomplete, "error");
  assert.equal(out.modelCall, "failed");
  assert.equal(out.crew?.specialists[0]?.text, "CI is green.");
  assert.equal(canRetryIncomplete(out.incomplete ?? "error"), true);
});

test("a synthesis cut for length is too_long and offers no retry", async () => {
  stubStream([
    [kickoff],
    [ndjson(delta("CI is green."), done)],
    [ndjson(delta("A very long"), broken("response_too_long"))],
  ]);
  const out = await run().result;
  assert.equal(out.text, "A very long");
  assert.equal(out.incomplete, "too_long");
  assert.equal(canRetryIncomplete(out.incomplete ?? "error"), false);
});

test("a specialist cut for length is kept and marked too_long", async () => {
  stubStream([
    [kickoff],
    [ndjson(delta("Long answer"), broken("response_too_long"))],
    [ndjson(delta("Summary."), done)],
  ]);
  const out = await run().result;
  assert.equal(out.crew?.specialists[0]?.step?.incomplete, "too_long");
  assert.equal(out.text, "Summary.");
});

test("a specialist that broke before any text is a failure, no partial", async () => {
  stubStream([[kickoff], [ndjson(broken("server"))]]);
  const out = await run().result;
  assert.equal(out.crew?.specialists[0]?.step?.ok, false);
  assert.equal(out.crew?.specialists[0]?.step?.incomplete, undefined);
});

test("a cancel during the synthesis is not turned into a stored partial", async () => {
  const user = new AbortController();
  stubStream([
    [kickoff],
    [ndjson(delta("CI is green."), done)],
    [ndjson(delta("Overall")), "stall"],
  ]);
  const { result, snapshots } = run({ signal: user.signal });
  setTimeout(() => user.abort(), 40);
  const out = await result;
  const seen = snapshots.map((entries) => entries.map((e) => e.text));
  assert.ok(seen.some((texts) => texts.includes("Overall")));
  // The UI's cancel stores the live entries; this path keeps its old shape.
  assert.equal(out.incomplete, undefined);
});
