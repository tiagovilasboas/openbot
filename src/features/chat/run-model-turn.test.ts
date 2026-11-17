import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { chatCopy } from "./chat-copy.ts";
import { fakeStreamResponse, ndjson } from "./fake-stream-response.ts";
import type { LiveTurnView } from "./live-turn.ts";

const { runModelTurn } = await import("./run-model-turn.ts");
const { startLiveTurn } = await import("./live-turn.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const chief = CREW_PRESETS.find(
  (b) => b.id === "chief-of-staff",
) as unknown as BotProfile;
const modelConfig: ClientModelConfig = {
  provider: "router",
  baseUrl: "https://router.test/v1",
  model: "vendor/m",
};
const request = (language: "en" | "pt" = "en") => ({
  text: "hi",
  language,
  history: [{ role: "user" as const, text: "hi" }],
  activeBot: chief,
  gitHubToken: null,
  modelConfig,
});

function view(language: "en" | "pt" = "en") {
  const calls = { live: [] as unknown[] };
  const v: LiveTurnView = {
    language,
    abortRef: { current: null },
    setBusy: () => {},
    setTurnBotId: () => {},
    setLive: (m) => calls.live.push(m),
    setToolSteps: () => {},
  };
  return { v, calls };
}

const delta = (text: string) => ({ type: "delta", text });

function stubStream(chunks: Parameters<typeof fakeStreamResponse>[0]) {
  globalThis.fetch = (async (
    _url: string | URL | Request,
    init?: RequestInit,
  ) => fakeStreamResponse(chunks, init?.signal)) as typeof fetch;
}

test("a finished turn returns the reply, is not cancelled and ends the live turn", async () => {
  stubStream([ndjson(delta("Hello"), { type: "done", provider: "stub" })]);
  const { v, calls } = view();
  const turn = startLiveTurn(v, chief.id);
  const out = await runModelTurn(turn, request());
  assert.equal(out.cancelled, false);
  assert.equal(out.reply.text, "Hello");
  assert.equal(v.abortRef.current, null);
  assert.deepEqual(calls.live.at(-1), []);
});

test("a model error is a reply with its failure copy, not a cancel", async () => {
  stubStream([
    ndjson({ type: "error", code: "auth", provider: "stub", status: 401 }),
  ]);
  const turn = startLiveTurn(view().v, chief.id);
  const out = await runModelTurn(turn, request());
  assert.equal(out.cancelled, false);
  assert.match(out.reply.text, /API key/i);
  assert.equal(out.reply.modelCall, "failed");
});

test("a cancel after some text stores what had arrived, marked cancelled", async () => {
  stubStream([ndjson(delta("Partway")), "stall"]);
  const { v } = view();
  const turn = startLiveTurn(v, chief.id);
  const pending = runModelTurn(turn, request());
  setTimeout(() => turn.controller.abort(), 20);
  const out = await pending;
  assert.equal(out.cancelled, true);
  assert.equal(out.reply.text, "Partway");
  assert.equal(out.reply.incomplete, "cancelled");
  assert.equal(v.abortRef.current, null);
});

test("a cancel before any text stores the cancelled note in the turn's language", async () => {
  stubStream(["stall"]);
  const turn = startLiveTurn(view("pt").v, chief.id);
  const pending = runModelTurn(turn, request("pt"));
  setTimeout(() => turn.controller.abort(), 10);
  const out = await pending;
  assert.equal(out.cancelled, true);
  assert.deepEqual(out.reply, { text: chatCopy.pt.cancelledNote });
});

test("a turn already cancelled returns the note without waiting for the model", async () => {
  stubStream([ndjson(delta("late"), { type: "done", provider: "stub" })]);
  const turn = startLiveTurn(view().v, chief.id);
  turn.controller.abort();
  const out = await runModelTurn(turn, request());
  assert.equal(out.cancelled, true);
  assert.equal(out.reply.text, chatCopy.en.cancelledNote);
});

test("an unreachable network is a failure reply, not a throw", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  const turn = startLiveTurn(view().v, chief.id);
  const out = await runModelTurn(turn, request());
  assert.equal(out.cancelled, false);
  assert.ok(out.reply.text.length > 0);
  assert.equal(out.reply.modelCall, "failed");
});
