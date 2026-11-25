import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../../../bots/crew-presets.ts";
import { streamResponse } from "../../../../shared/testing/stream-fixtures.ts";
import { applySettings } from "../../../settings/server/settings-repository.ts";
import { createAskUserTool } from "../../../tools/server/ask-user-tool.ts";
import {
  scriptedProvider,
  textReply,
  toolCallSse,
  withDb,
} from "../../../tools/server/tool-turn-fixtures.ts";
import { createToolRegistry } from "../../../tools/tool-registry.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";
import { createToolChannelAsker } from "./tool-channel-asker.ts";

const speaker = { ...CREW_PRESETS[0]!, toolsEnabled: true };
const call = (resume?: Parameters<AskCrewModel>[0]["resume"]) => ({
  systemPrompt: "You are a bot.",
  messages: [{ role: "user" as const, text: "plan the trip" }],
  speaker,
  ...(resume ? { resume } : {}),
});
const QUESTION = { question: "Where to?", options: ["Rome", "Oslo"] };

/** The model asks the user once, then answers using what came back. */
const asksThenAnswers = () =>
  scriptedProvider((body) =>
    body.messages.some((m) => m.role === "tool")
      ? textReply("going")
      : streamResponse(
          toolCallSse([{ id: "q1", name: "ask_user", args: QUESTION }]),
        ),
  );

function asker(db: Parameters<typeof applySettings>[0]) {
  applySettings(db, {
    language: "en",
    modelConfig: {
      provider: "router",
      baseUrl: "https://93.184.216.34/v1",
      model: "vendor/model",
    },
  });
  const script = asksThenAnswers();
  const ask = createToolChannelAsker(
    db,
    async () => {
      throw new Error("plain model must not run");
    },
    {
      env: { OPENBOT_TOOLS: "1" },
      fetchImpl: script.fetchImpl,
      tools: createToolRegistry([createAskUserTool()]),
      capabilityOf: async () => "native",
    },
  );
  return { ask, bodies: script.bodies };
}

async function pause(ask: AskCrewModel) {
  const paused = await ask(call());
  assert.equal(paused.ok, false);
  const pending = paused.ok ? null : paused.pause;
  assert.ok(pending);
  return { pending, waiting: pending.calls[0]! };
}

function answerTo(
  pending: { turnId: string },
  waiting: { callId: string; argsDigest: string },
  answer: { kind: "option"; index: number } | { kind: "text"; text: string },
  argsDigest = waiting.argsDigest,
) {
  return call({
    turnId: pending.turnId,
    decisions: [
      { callId: waiting.callId, decision: "once", argsDigest, answer },
    ],
  });
}

test("a group member's ask_user pauses the turn with its question", async () => {
  await withDb(async (db) => {
    const { ask } = asker(db);
    const { waiting } = await pause(ask);
    assert.equal(waiting.name, "ask_user");
    assert.deepEqual(waiting.ask, { ...QUESTION, allowFreeText: false });
  });
});

test("the answer resumes the stored call and reaches the model", async () => {
  await withDb(async (db) => {
    const { ask, bodies } = asker(db);
    const { pending, waiting } = await pause(ask);
    const reply = await ask(
      answerTo(pending, waiting, { kind: "option", index: 1 }),
    );
    assert.deepEqual(reply, { ok: true, text: "going" });
    assert.match(JSON.stringify(bodies.at(-1)?.messages), /answer\\*"\W+Oslo/);
  });
});

test("an answer outside the stored question never reaches the model", async () => {
  await withDb(async (db) => {
    const { ask, bodies } = asker(db);
    const { pending, waiting } = await pause(ask);
    await ask(answerTo(pending, waiting, { kind: "text", text: "Mars" }));
    assert.doesNotMatch(JSON.stringify(bodies.at(-1)?.messages), /Mars/);
  });
});

test("a changed digest drops the answer; a second answer is refused", async () => {
  await withDb(async (db) => {
    const { ask, bodies } = asker(db);
    const { pending, waiting } = await pause(ask);
    const option = { kind: "option", index: 0 } as const;
    await ask(answerTo(pending, waiting, option, "f".repeat(64)));
    assert.doesNotMatch(
      JSON.stringify(bodies.at(-1)?.messages),
      /answer\\*"\W+Rome/,
    );
    assert.deepEqual(await ask(answerTo(pending, waiting, option)), {
      ok: false,
    });
  });
});
