import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../../../bots/crew-presets.ts";
import { streamResponse } from "../../../../shared/testing/stream-fixtures.ts";
import { applySettings } from "../../../settings/server/settings-repository.ts";
import { listRecentAudit } from "../../../tools/server/audit-repository.ts";
import {
  fakeTools,
  scriptedProvider,
  textReply,
  toolCallSse,
  withDb,
} from "../../../tools/server/tool-turn-fixtures.ts";
import type { FetchLike } from "../../../model/model-adapter.ts";
import { grantTool } from "../../../tools/server/grants-repository.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";
import { createToolChannelAsker } from "./tool-channel-asker.ts";

const speaker = { ...CREW_PRESETS[0]!, toolsEnabled: true };
const call = (extra: Partial<Parameters<AskCrewModel>[0]> = {}) => ({
  systemPrompt: "You are a bot.",
  messages: [{ role: "user" as const, text: "look it up" }],
  speaker,
  ...extra,
});
const toolCall = (name: string, id: string) =>
  streamResponse(toolCallSse([{ id, name, args: { q: id } }]));

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

function asker(
  db: Parameters<typeof applySettings>[0],
  fetchImpl: FetchLike,
  plain: AskCrewModel,
  gate = "1",
) {
  const { registry, lookup, note } = fakeTools();
  return {
    lookup,
    note,
    ask: createToolChannelAsker(db, plain, {
      env: { OPENBOT_TOOLS: gate },
      fetchImpl,
      tools: registry,
      capabilityOf: async () => "native",
    }),
  };
}

const noPlain: AskCrewModel = async () => {
  throw new Error("plain model must not run");
};

test("a group member runs a no-approval tool, wraps its result and audits it", async () => {
  await withDb(async (db) => {
    setup(db);
    const { fetchImpl, bodies } = scriptedProvider((_b, index) =>
      index === 0 ? toolCall("lookup", "c1") : textReply("found it"),
    );
    const { ask, lookup } = asker(db, fetchImpl, noPlain);
    assert.deepEqual(await ask(call()), { ok: true, text: "found it" });
    assert.deepEqual(lookup.runs, [{ q: "c1" }]);
    const toolMessage = bodies[1]!.messages.find((m) => m.role === "tool");
    assert.match(String(toolMessage?.content), /^<external-data>/);
    assert.match(String(bodies[1]!.messages[0]!.content), /external-data/);
    const audit = listRecentAudit(db);
    assert.equal(audit.length, 1);
    assert.equal(audit[0]!.botId, speaker.id);
    assert.equal(audit[0]!.decision, "auto");
  });
});

test("a tool that needs approval does not run: the turn pauses with its call", async () => {
  await withDb(async (db) => {
    setup(db);
    const { fetchImpl, bodies } = scriptedProvider(() =>
      toolCall("note", "n1"),
    );
    const { ask, note } = asker(db, fetchImpl, noPlain);
    const reply = await ask(call());
    assert.equal(reply.ok, false);
    const pause = reply.ok ? null : reply.pause;
    assert.equal(pause?.calls.length, 1);
    assert.equal(pause?.calls[0]?.name, "note");
    assert.equal(pause?.calls[0]?.allowAlways, true);
    assert.equal(note.runs.length, 0);
    assert.equal(bodies.length, 1);
  });
});

test("a tool the bot was granted for always runs without asking", async () => {
  await withDb(async (db) => {
    setup(db);
    grantTool(db, speaker.id, "note", Date.now());
    const { fetchImpl } = scriptedProvider((_b, index) =>
      index === 0 ? toolCall("note", "n1") : textReply("noted"),
    );
    const { ask, note } = asker(db, fetchImpl, noPlain);
    assert.deepEqual(await ask(call()), { ok: true, text: "noted" });
    assert.equal(note.runs.length, 1);
  });
});

test("a member without tools, the picker, or a closed gate use the plain model", async () => {
  await withDb(async (db) => {
    setup(db);
    const { fetchImpl, bodies } = scriptedProvider(() => textReply());
    const seen: string[] = [];
    const plain: AskCrewModel = async () => {
      seen.push("plain");
      return { ok: true, text: "plain" };
    };
    const open = asker(db, fetchImpl, plain).ask;
    await open(call({ speaker: { ...speaker, toolsEnabled: false } }));
    await open(call({ speaker: undefined }));
    await asker(db, fetchImpl, plain, "off").ask(call());
    assert.equal(seen.length, 3);
    assert.equal(bodies.length, 0);
  });
});

test("the per-turn call cap holds in a group", async () => {
  await withDb(async (db) => {
    setup(db);
    let n = 0;
    const { fetchImpl, bodies } = scriptedProvider((body) =>
      body.tools ? toolCall("lookup", `c${(n += 1)}`) : textReply("enough"),
    );
    const { ask, lookup } = asker(db, fetchImpl, noPlain);
    assert.deepEqual(await ask(call()), { ok: true, text: "enough" });
    assert.ok(lookup.runs.length <= 4);
    assert.ok(bodies.length <= 4);
  });
});
