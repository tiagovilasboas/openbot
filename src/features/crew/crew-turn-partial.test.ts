import assert from "node:assert/strict";
import test from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import { crewCopy } from "./crew-copy.ts";
import { runCrewTurn, type AskCrewModel } from "./run-crew-turn.ts";

const bots = [...CREW_PRESETS];
const chief = CREW_PRESETS[0] as BotProfile;

type Call = Parameters<AskCrewModel>[0];
const isSynthesis = (call: Call) => call.systemPrompt.startsWith("CHIEF");

function run(askModel: AskCrewModel) {
  return runCrewTurn({
    chief,
    chiefPrompt: "CHIEF PROMPT",
    chiefReply: "@delegate Engineering: check CI",
    bots,
    history: [{ role: "user", text: "how is CI?" }],
    userText: "how is CI?",
    language: "en",
    askModel,
  });
}

test("a specialist cut midway keeps its partial text and still feeds the synthesis", async () => {
  const calls: Call[] = [];
  const turn = await run(async (call) => {
    calls.push(call);
    return isSynthesis(call)
      ? { ok: true, text: "final" }
      : { ok: false, partial: { text: "CI is gre", kind: "error" } };
  });

  assert.ok(turn);
  const [step] = turn.specialists;
  assert.equal(step?.ok, true);
  assert.equal(step?.text, "CI is gre");
  assert.equal(step?.incomplete, "error");
  assert.equal(turn.synthesis, "final");
  assert.equal(turn.synthesisIncomplete, undefined);

  const report = calls.find(isSynthesis)?.messages.at(-1)?.text ?? "";
  assert.match(report, /<external-data>\nCI is gre\n<\/external-data>/);
  assert.ok(report.includes(crewCopy.en.specialistCut));
});

test("a complete specialist answer carries no cut notice", async () => {
  const calls: Call[] = [];
  await run(async (call) => {
    calls.push(call);
    return { ok: true, text: "whole" };
  });
  const report = calls.find(isSynthesis)?.messages.at(-1)?.text ?? "";
  assert.ok(!report.includes(crewCopy.en.specialistCut));
});

test("a specialist that failed with no text still counts as failed", async () => {
  const turn = await run(async () => ({ ok: false }));
  assert.equal(turn?.specialists[0]?.ok, false);
  assert.equal(turn?.specialists[0]?.incomplete, undefined);
  assert.equal(turn?.synthesis, null);
});

test("a synthesis cut midway keeps its partial text and its kind", async () => {
  const turn = await run(async (call) =>
    isSynthesis(call)
      ? { ok: false, partial: { text: "All good, but", kind: "too_long" } }
      : { ok: true, text: "whole" },
  );
  assert.equal(turn?.synthesis, "All good, but");
  assert.equal(turn?.synthesisIncomplete, "too_long");
});

test("the cut notice exists in every language", () => {
  for (const language of ["pt", "en", "es"] as const) {
    assert.ok(crewCopy[language].specialistCut.length > 20);
  }
});
