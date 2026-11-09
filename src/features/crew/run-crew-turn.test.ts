import assert from "node:assert/strict";
import test from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import {
  MAX_DELEGATIONS_PER_TURN,
  runCrewTurn,
  type AskCrewModel,
} from "./run-crew-turn.ts";

const bots = [...CREW_PRESETS];
const chief = CREW_PRESETS[0] as BotProfile;

type Call = Parameters<AskCrewModel>[0];

function fakeModel(answer: (call: Call) => string | null | Error) {
  const calls: Call[] = [];
  const askModel: AskCrewModel = async (call) => {
    calls.push(call);
    const result = answer(call);
    if (result instanceof Error) throw result;
    return result === null ? { ok: false } : { ok: true, text: result };
  };
  return { calls, askModel };
}

function run(chiefReply: string, askModel: AskCrewModel) {
  return runCrewTurn({
    chief,
    chiefPrompt: "CHIEF PROMPT",
    chiefReply,
    bots,
    history: [{ role: "user", text: "help me ship" }],
    userText: "help me ship",
    language: "en",
    askModel,
  });
}

const isSynthesis = (call: Call) => call.systemPrompt.startsWith("CHIEF");

test("no delegation line means no crew turn and no model call", async () => {
  const model = fakeModel(() => "unused");
  assert.equal(await run("Just do it.", model.askModel), null);
  assert.equal(model.calls.length, 0);
});

test("runs at most three specialists and synthesizes once", async () => {
  const model = fakeModel((call) =>
    isSynthesis(call) ? "final answer" : "specialist answer",
  );
  const reply = [
    "@delegate Engineering: a",
    "@delegate Security: b",
    "@delegate Product: c",
    "@delegate Finance: d",
  ].join("\n");
  const turn = await run(reply, model.askModel);

  assert.ok(turn);
  assert.equal(turn.specialists.length, MAX_DELEGATIONS_PER_TURN);
  assert.deepEqual(
    turn.specialists.map((s) => s.bot.id),
    ["engineering", "security", "product"],
  );
  assert.equal(model.calls.filter(isSynthesis).length, 1);
  assert.equal(model.calls.length, 4);
  assert.equal(turn.synthesis, "final answer");
  assert.equal(turn.kickoff, "Delegating to Engineering, Security, Product.");
});

test("specialists get their own prompt, the anti-loop rule and the task", async () => {
  const model = fakeModel((call) => (isSynthesis(call) ? "done" : "ok"));
  await run("@delegate Engineering: review PR 7", model.askModel);
  const [specialist] = model.calls;
  assert.ok(specialist);
  assert.match(specialist.systemPrompt, /^Você é o Engineering/);
  assert.match(specialist.systemPrompt, /\[Anti-Loop Rule\]/);
  assert.match(specialist.messages[0]?.text ?? "", /help me ship/);
  assert.match(specialist.messages[0]?.text ?? "", /review PR 7/);
});

test("single hop: a specialist's own @delegate is never followed", async () => {
  const model = fakeModel((call) =>
    isSynthesis(call) ? "done" : "@delegate Security: go deeper",
  );
  const turn = await run("@delegate Engineering: a", model.askModel);
  assert.ok(turn);
  assert.equal(turn.specialists.length, 1);
  assert.equal(model.calls.length, 2);
});

test("unknown bots are ignored", async () => {
  const model = fakeModel((call) => (isSynthesis(call) ? "done" : "ok"));
  const turn = await run(
    "@delegate Nobody: x\n@delegate Engineering: y",
    model.askModel,
  );
  assert.ok(turn);
  assert.deepEqual(
    turn.specialists.map((s) => s.bot.id),
    ["engineering"],
  );
});

test("a failing specialist does not break the turn", async () => {
  const model = fakeModel((call) => {
    if (isSynthesis(call)) return "final";
    if (/^Você é o Engineering/.test(call.systemPrompt)) {
      return new Error("network");
    }
    if (/^Você é o Security/.test(call.systemPrompt)) return null;
    return "product answer";
  });
  const turn = await run(
    "@delegate Engineering: a\n@delegate Security: b\n@delegate Product: c",
    model.askModel,
  );
  assert.ok(turn);
  assert.deepEqual(
    turn.specialists.map((s) => s.ok),
    [false, false, true],
  );
  assert.equal(
    turn.specialists[0]?.text,
    "Engineering could not answer this time.",
  );
  assert.equal(turn.synthesis, "final");
  const synthesis = model.calls.find(isSynthesis);
  assert.match(synthesis?.messages.at(-1)?.text ?? "", /product answer/);
  assert.doesNotMatch(synthesis?.messages.at(-1)?.text ?? "", /Engineering/);
});

test("when every specialist fails there is no synthesis call", async () => {
  const model = fakeModel(() => null);
  const turn = await run("@delegate Engineering: a", model.askModel);
  assert.ok(turn);
  assert.equal(turn.synthesis, null);
  assert.equal(model.calls.length, 1);
});

test("the kickoff keeps the Chief's own words before the delegation note", async () => {
  const model = fakeModel(() => "x");
  const turn = await run("On it.\n@delegate Engineering: a", model.askModel);
  assert.equal(turn?.kickoff, "On it.\n\nDelegating to Engineering.");
});
