import assert from "node:assert/strict";
import test from "node:test";
import { createBotProfile } from "../bots/bot-storage.ts";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import { crewCopy } from "./crew-copy.ts";
import { parseDelegations } from "./parse-delegations.ts";
import {
  runCrewTurn,
  type AskCrewModel,
  type CrewMessage,
} from "./run-crew-turn.ts";

const chief = CREW_PRESETS[0] as BotProfile;
const reviewer: BotProfile = {
  ...createBotProfile({ name: "Code Reviewer" }),
  id: "bot_reviewer",
};
const bots: BotProfile[] = [...CREW_PRESETS, reviewer];
const ids = (reply: string) =>
  parseDelegations(reply, bots, chief.id).delegations.map((d) => d.bot.id);

// --- parseDelegations -------------------------------------------------------

test("handles with spaces, hyphens, underscores and @ all reach the same bot", () => {
  for (const handle of [
    "Code Reviewer",
    "code-reviewer",
    "code_reviewer",
    "@CodeReviewer",
    "bot_reviewer",
    "BOT-REVIEWER",
  ]) {
    assert.deepEqual(ids(`@delegate ${handle}: x`), ["bot_reviewer"], handle);
  }
});

test("the Portuguese alias @delegar works with every decoration", () => {
  const reply = [
    "@delegar Engineering: a",
    "**@delegar Security:** b",
    "- @DELEGAR product: c",
    "> `@delegar Finance: d`",
  ].join("\n");
  assert.deepEqual(ids(reply), [
    "engineering",
    "security",
    "product",
    "finance",
  ]);
});

test("bullets, quotes, numbering and dashes before the keyword are stripped", () => {
  for (const prefix of [
    "• ",
    "> ",
    "1) ",
    "2. ",
    "– ",
    "- ",
    "  ",
    "* ",
    "10. ",
  ]) {
    assert.deepEqual(
      ids(`${prefix}@delegate Engineering: go`),
      ["engineering"],
      JSON.stringify(prefix),
    );
  }
});

test("only the first colon splits the bot from the task", () => {
  const parsed = parseDelegations(
    "@delegate Engineering: fix: the build, then: ship",
    bots,
    chief.id,
  );
  assert.equal(parsed.delegations[0]?.task, "fix: the build, then: ship");
});

test("Windows line endings still parse and strip the delegation lines", () => {
  const parsed = parseDelegations(
    "Plan.\r\n@delegate Engineering: a\r\n@delegate Security: b\r\n",
    bots,
    chief.id,
  );
  assert.deepEqual(
    parsed.delegations.map((d) => d.bot.id),
    ["engineering", "security"],
  );
  assert.equal(parsed.visibleText, "Plan.");
});

test("a keyword in the middle of a sentence is plain text", () => {
  const reply = "I will @delegate Engineering: later";
  const parsed = parseDelegations(reply, bots, chief.id);
  assert.equal(parsed.delegations.length, 0);
  assert.equal(parsed.visibleText, reply);
});

test("a keyword glued to a name or without a colon is plain text", () => {
  for (const line of [
    "@delegateEngineering: x",
    "@delegate Engineering do it",
    "@delegate",
  ]) {
    const parsed = parseDelegations(line, bots, chief.id);
    assert.equal(parsed.delegations.length, 0, line);
    assert.equal(parsed.visibleText, line, line);
  }
});

test("an empty bot name leaves the visible text without delegating", () => {
  const parsed = parseDelegations("hi\n@delegate : task", bots, chief.id);
  assert.equal(parsed.delegations.length, 0);
  assert.equal(parsed.visibleText, "hi");
});

test("the same bot named twice through different aliases is delegated once, to the first task", () => {
  const parsed = parseDelegations(
    "@delegate Engineering: first\n@delegate @engineering: second\n@delegar ENGINEERING: third",
    bots,
    chief.id,
  );
  assert.deepEqual(
    parsed.delegations.map((d) => d.task),
    ["first"],
  );
});

test("the Chief is ignored by name, handle and id", () => {
  assert.deepEqual(
    ids(
      "@delegate Chief of Staff: a\n@delegate @ChiefofStaff: b\n@delegate chief-of-staff: c",
    ),
    [],
  );
});

test("a task that is only decoration is dropped but its line still disappears", () => {
  const parsed = parseDelegations(
    "Before\n@delegate Engineering: **\nAfter",
    bots,
    chief.id,
  );
  assert.equal(parsed.delegations.length, 0);
  assert.equal(parsed.visibleText, "Before\nAfter");
});

test("blank lines between prose are kept, only the ends are trimmed", () => {
  const parsed = parseDelegations(
    "\n\nOne.\n\nTwo.\n@delegate Engineering: x\n\n",
    bots,
    chief.id,
  );
  assert.equal(parsed.visibleText, "One.\n\nTwo.");
});

test("an empty reply and an empty bot list are safe", () => {
  assert.deepEqual(parseDelegations("", bots, chief.id), {
    delegations: [],
    visibleText: "",
  });
  assert.equal(
    parseDelegations("@delegate Engineering: x", [], chief.id).delegations
      .length,
    0,
  );
});

// --- runCrewTurn ------------------------------------------------------------

type Call = Parameters<AskCrewModel>[0];

function fakeModel(
  answer: (call: Call, index: number) => string | null | Error,
) {
  const calls: Call[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const askModel: AskCrewModel = async (call) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    calls.push(call);
    await new Promise((resolve) => setTimeout(resolve, 1));
    inFlight -= 1;
    const result = answer(call, calls.length - 1);
    if (result instanceof Error) throw result;
    return result === null ? { ok: false } : { ok: true, text: result };
  };
  return { calls, askModel, maxInFlight: () => maxInFlight };
}

const isSynthesis = (call: Call) => call.systemPrompt.startsWith("CHIEF");

function run(
  chiefReply: string,
  askModel: AskCrewModel,
  extra: Partial<Parameters<typeof runCrewTurn>[0]> = {},
) {
  return runCrewTurn({
    chief,
    chiefPrompt: "CHIEF PROMPT",
    chiefReply,
    bots,
    history: [],
    userText: "do the thing",
    language: "en",
    askModel,
    ...extra,
  });
}

test("the synthesis call carries the history, the kickoff and the specialists' report in order", async () => {
  const history: CrewMessage[] = [
    { role: "user", text: "earlier question" },
    { role: "assistant", text: "earlier answer" },
    { role: "user", text: "do the thing" },
  ];
  const model = fakeModel((call) =>
    isSynthesis(call) ? "final" : "spec says",
  );
  const turn = await run(
    "Plan first.\n@delegate Engineering: a\n@delegate Security: b",
    model.askModel,
    { history },
  );

  const synthesis = model.calls.at(-1);
  assert.ok(synthesis && isSynthesis(synthesis));
  assert.match(synthesis.systemPrompt, /^CHIEF PROMPT\n\n/);
  assert.ok(synthesis.systemPrompt.endsWith(crewCopy.en.synthesisRule));
  assert.deepEqual(synthesis.messages.slice(0, 3), history);
  assert.deepEqual(synthesis.messages[3], {
    role: "assistant",
    text: turn?.kickoff,
  });
  const last = synthesis.messages[4];
  assert.equal(last?.role, "user");
  assert.equal(
    last?.text,
    `${crewCopy.en.synthesisRequest}\n\n### Engineering\nspec says\n\n### Security\nspec says`,
  );
  assert.equal(synthesis.messages.length, 5);
  // The caller's history array is not extended.
  assert.equal(history.length, 3);
});

test("a long specialist answer is cut to 1200 characters in the report only", async () => {
  const long = "x".repeat(5000);
  const model = fakeModel((call) => (isSynthesis(call) ? "final" : long));
  const turn = await run("@delegate Engineering: a", model.askModel);
  const report = model.calls.at(-1)?.messages.at(-1)?.text ?? "";
  assert.ok(report.includes("x".repeat(1200)));
  assert.ok(!report.includes("x".repeat(1201)));
  assert.equal(turn?.specialists[0]?.text.length, 5000);
});

test("failed specialists are left out of the report but stay in the turn", async () => {
  const model = fakeModel((call) => {
    if (isSynthesis(call)) return "final";
    return /^Você é o Security/.test(call.systemPrompt) ? null : "ok answer";
  });
  const turn = await run(
    "@delegate Engineering: a\n@delegate Security: b",
    model.askModel,
  );
  const report = model.calls.at(-1)?.messages.at(-1)?.text ?? "";
  assert.match(report, /### Engineering/);
  assert.doesNotMatch(report, /### Security/);
  assert.doesNotMatch(report, /could not answer/);
  assert.equal(turn?.specialists.length, 2);
  assert.equal(turn?.specialists[1]?.ok, false);
});

test("specialists are asked strictly one at a time, in order", async () => {
  const model = fakeModel((call) => (isSynthesis(call) ? "final" : "ok"));
  await run(
    "@delegate Engineering: a\n@delegate Security: b\n@delegate Product: c",
    model.askModel,
  );
  assert.equal(model.maxInFlight(), 1);
  assert.deepEqual(
    model.calls.map((c) => c.systemPrompt.match(/^Você é o (\w+)/)?.[1]),
    ["Engineering", "Security", "Product", undefined],
  );
});

test("onBotWorking follows each specialist and then the Chief, and stays silent without delegation", async () => {
  const seen: string[] = [];
  const model = fakeModel((call) => (isSynthesis(call) ? "final" : "ok"));
  await run("@delegate Engineering: a\n@delegate Security: b", model.askModel, {
    onBotWorking: (bot) => seen.push(bot.id),
  });
  assert.deepEqual(seen, ["engineering", "security", "chief-of-staff"]);

  const quiet: string[] = [];
  await run("no delegation", model.askModel, {
    onBotWorking: (bot) => quiet.push(bot.id),
  });
  assert.deepEqual(quiet, []);
});

test("when every specialist fails the Chief is not announced as working", async () => {
  const seen: string[] = [];
  const model = fakeModel(() => null);
  const turn = await run("@delegate Engineering: a", model.askModel, {
    onBotWorking: (bot) => seen.push(bot.id),
  });
  assert.equal(turn?.synthesis, null);
  assert.deepEqual(seen, ["engineering"]);
});

test("a synthesis that fails or throws gives a null synthesis, not a throw", async () => {
  for (const failure of [null, new Error("boom")]) {
    const model = fakeModel((call) => (isSynthesis(call) ? failure : "ok"));
    const turn = await run("@delegate Engineering: a", model.askModel);
    assert.equal(turn?.synthesis, null);
    assert.equal(turn?.specialists[0]?.ok, true);
  }
});

test("repeated and unknown delegations do not use up the three slots", async () => {
  const model = fakeModel((call) => (isSynthesis(call) ? "final" : "ok"));
  const turn = await run(
    [
      "@delegate Engineering: a",
      "@delegate Engineering: again",
      "@delegate Nobody: x",
      "@delegate Security: b",
      "@delegate Product: c",
      "@delegate Finance: d",
    ].join("\n"),
    model.askModel,
  );
  assert.deepEqual(
    turn?.specialists.map((s) => s.bot.id),
    ["engineering", "security", "product"],
  );
});

test("a reply that only delegates has a kickoff with just the delegation note", async () => {
  const model = fakeModel((call) => (isSynthesis(call) ? "final" : "ok"));
  const turn = await run("@delegate Engineering: a", model.askModel);
  assert.equal(turn?.kickoff, "Delegating to Engineering.");
});

test("Portuguese turns use the Portuguese copy for the kickoff, requests and failures", async () => {
  const model = fakeModel((call) => {
    if (isSynthesis(call)) return "final";
    return /^Você é o Security/.test(call.systemPrompt) ? null : "ok";
  });
  const turn = await run(
    "@delegar Engineering: revise\n@delegar Security: avalie",
    model.askModel,
    { language: "pt" },
  );
  assert.equal(turn?.kickoff, "Delegando para Engineering, Security.");
  assert.equal(
    turn?.specialists[1]?.text,
    "Security não conseguiu responder desta vez.",
  );
  const request = model.calls[0]?.messages[0]?.text ?? "";
  assert.match(request, /Pedido original do usuário:\ndo the thing/);
  assert.match(request, /Sua tarefa, enviada pelo Chief of Staff:\nrevise/);
  assert.match(model.calls[0]?.systemPrompt ?? "", /Regra Anti-Loop/);
  assert.ok(
    model.calls.at(-1)?.systemPrompt.endsWith(crewCopy.pt.synthesisRule),
  );
});

test("a custom bot with spaces in its name can be delegated to", async () => {
  const model = fakeModel((call) => (isSynthesis(call) ? "final" : "reviewed"));
  const turn = await run("@delegate Code Reviewer: look", model.askModel);
  assert.equal(turn?.specialists[0]?.bot.id, "bot_reviewer");
  assert.equal(turn?.kickoff, "Delegating to Code Reviewer.");
});
