import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import { buildCrewRoomView } from "../crew/crew-room-view.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
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

type Reply = string | { status: number };

function stubChat(replies: Reply[]) {
  const queue = [...replies];
  globalThis.fetch = (async () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("unexpected call");
    return typeof next === "string"
      ? Response.json({ provider: "router", text: next })
      : Response.json(
          { error: "provider_rejected", detail: "x" },
          { status: next.status },
        );
  }) as typeof fetch;
}

test("a delegated turn is stored with each task, status and duration, and reads back as a room", async () => {
  stubChat([
    "@delegate Engineering: check CI\n@delegate Security: scan",
    "CI is green",
    { status: 502 },
    "final answer",
  ]);
  const reply = await executeChatMessage({
    text: "ship it",
    language: "en",
    history: [{ role: "user", text: "ship it" }],
    activeBot: chief,
    bots,
    mainBotId: "chief-of-staff",
    gitHubToken: null,
    modelConfig,
  });

  let id = 10;
  const stored = buildReplyMessages(reply, {
    language: "en",
    nextId: () => ++id,
  });
  const [engineering, security] = stored.slice(1, 3);
  assert.deepEqual(
    [engineering?.crewStep?.task, engineering?.crewStep?.ok],
    ["check CI", true],
  );
  assert.deepEqual(
    [security?.crewStep?.task, security?.crewStep?.ok],
    ["scan", false],
  );
  for (const message of [engineering, security]) {
    const duration = message?.crewStep?.durationMs;
    assert.ok(typeof duration === "number" && duration >= 0);
  }
  // The kickoff and the synthesis carry no step record of their own.
  assert.equal(stored[0]?.crewStep, undefined);
  assert.equal(stored.at(-1)?.crewStep, undefined);

  const room = buildCrewRoomView(stored);
  assert.deepEqual(
    room?.steps.map((s) => [s.bot.id, s.task, s.status]),
    [
      ["engineering", "check CI", "done"],
      ["security", "scan", "failed"],
    ],
  );
  assert.equal(room?.synthesis.text, "final answer");
});
