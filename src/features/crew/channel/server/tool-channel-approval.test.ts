import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../../../bots/crew-presets.ts";
import { streamResponse } from "../../../../shared/testing/stream-fixtures.ts";
import type { FetchLike } from "../../../model/model-adapter.ts";
import { applySettings } from "../../../settings/server/settings-repository.ts";
import { listRecentAudit } from "../../../tools/server/audit-repository.ts";
import { listGrants } from "../../../tools/server/grants-repository.ts";
import { loadPendingTurn } from "../../../tools/server/pending-turns-repository.ts";
import {
  fakeTools,
  scriptedProvider,
  textReply,
  toolCallSse,
  withDb,
} from "../../../tools/server/tool-turn-fixtures.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";
import { createToolChannelAsker } from "./tool-channel-asker.ts";

const speaker = { ...CREW_PRESETS[0]!, toolsEnabled: true };
const MESSAGES = [{ role: "user" as const, text: "save a note" }];
const call = (resume?: Parameters<AskCrewModel>[0]["resume"]) => ({
  systemPrompt: "You are a bot.",
  messages: MESSAGES,
  speaker,
  ...(resume ? { resume } : {}),
});

function setup(db: Parameters<typeof applySettings>[0]) {
  applySettings(db, {
    language: "en",
    modelConfig: {
      provider: "router",
      baseUrl: "https://93.184.216.34/v1",
      model: "vendor/model",
    },
  });
}

function asker(db: Parameters<typeof applySettings>[0], fetchImpl: FetchLike) {
  const { registry, note } = fakeTools();
  const plain: AskCrewModel = async () => {
    throw new Error("plain model must not run");
  };
  return {
    note,
    ask: createToolChannelAsker(db, plain, {
      env: { OPENBOT_TOOLS: "1" },
      fetchImpl,
      tools: registry,
      capabilityOf: async () => "native",
    }),
  };
}

/** The model asks for "note" first, then answers once it has the result. */
const noteThenAnswer = () =>
  scriptedProvider((body, index) =>
    index === 0 || !body.messages.some((m) => m.role === "tool")
      ? streamResponse(
          toolCallSse([{ id: "n1", name: "note", args: { q: "n1" } }]),
        )
      : textReply("saved it"),
  );

/** Pauses the member and returns the decision for its one waiting call. */
async function pauseOnNote(
  ask: AskCrewModel,
  choice: "once" | "always" | "deny",
) {
  const paused = await ask(call());
  assert.equal(paused.ok, false);
  const pause = paused.ok ? null : paused.pause;
  assert.ok(pause);
  const waiting = pause.calls[0]!;
  return {
    pause,
    resume: {
      turnId: pause.turnId,
      decisions: [
        {
          callId: waiting.callId,
          decision: choice,
          argsDigest: waiting.argsDigest,
        },
      ],
    },
  };
}

test("approve once: the stored turn resumes, the tool runs and the member answers", async () => {
  await withDb(async (db) => {
    setup(db);
    const { fetchImpl, bodies } = noteThenAnswer();
    const { ask, note } = asker(db, fetchImpl);
    const { pause, resume } = await pauseOnNote(ask, "once");
    assert.equal(loadPendingTurn(db, speaker.id)?.id, pause.turnId);
    assert.equal(note.runs.length, 0);

    assert.deepEqual(await ask(call(resume)), { ok: true, text: "saved it" });
    assert.equal(note.runs.length, 1);
    assert.equal(loadPendingTurn(db, speaker.id), null);
    const result = bodies.at(-1)!.messages.find((m) => m.role === "tool");
    assert.match(String(result?.content), /^<external-data>/);
    assert.deepEqual(
      listRecentAudit(db).map((entry) => entry.decision),
      ["once", "asked"],
    );
    assert.equal(listGrants(db, speaker.id).length, 0);
  });
});

test("approve always: the tool runs and the bot is granted it", async () => {
  await withDb(async (db) => {
    setup(db);
    const { ask, note } = asker(db, noteThenAnswer().fetchImpl);
    const { resume } = await pauseOnNote(ask, "always");
    assert.equal((await ask(call(resume))).ok, true);
    assert.equal(note.runs.length, 1);
    assert.deepEqual(
      listGrants(db, speaker.id).map((grant) => grant.toolName),
      ["note"],
    );
  });
});

test("deny: the tool never runs and the member still answers", async () => {
  await withDb(async (db) => {
    setup(db);
    const { fetchImpl } = scriptedProvider((body) =>
      body.messages.some((m) => m.role === "tool")
        ? textReply("understood")
        : streamResponse(
            toolCallSse([{ id: "n1", name: "note", args: { q: "n1" } }]),
          ),
    );
    const { ask, note } = asker(db, fetchImpl);
    const { resume } = await pauseOnNote(ask, "deny");
    assert.deepEqual(await ask(call(resume)), { ok: true, text: "understood" });
    assert.equal(note.runs.length, 0);
    assert.equal(listGrants(db, speaker.id).length, 0);
  });
});

test("a decision resumes once; a changed request or a stale id is refused", async () => {
  await withDb(async (db) => {
    setup(db);
    const { ask, note } = asker(db, noteThenAnswer().fetchImpl);
    const { resume } = await pauseOnNote(ask, "once");
    const other = {
      ...call(resume),
      messages: [{ role: "user" as const, text: "else" }],
    };
    assert.deepEqual(await ask(other), { ok: false });
    assert.equal((await ask(call(resume))).ok, true);
    assert.deepEqual(await ask(call(resume)), { ok: false });
    assert.equal(note.runs.length, 1);
  });
});
