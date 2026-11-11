import assert from "node:assert/strict";
import test from "node:test";
import { MAX_SYSTEM_PROMPT_CHARS } from "../model/system-prompt-limit.ts";
import { createCustomSkill } from "../skills/skill-definition.ts";
import { createBotProfile } from "./bot-storage.ts";
import { describePromptBudget } from "./prompt-budget-copy.ts";
import { analyzePromptBudget, promptReserveFor } from "./prompt-budget.ts";

function bot(over: {
  description?: string;
  workspaceContext?: string;
  skills?: number;
}) {
  const profile = createBotProfile({
    name: "Big",
    description: over.description ?? "You help.",
  });
  profile.workspaceContext = over.workspaceContext;
  profile.skills = Array.from({ length: over.skills ?? 0 }, (_, i) =>
    createCustomSkill({
      name: `Skill${i}`,
      command: `/s${i}`,
      instructions: `do thing ${i} `.repeat(150),
      source: "created",
    }),
  );
  return profile;
}

test("a bot that fits reports nothing", () => {
  const report = analyzePromptBudget(bot({ skills: 2 }), "en");
  assert.deepEqual(report, {
    overBy: 0,
    skillsLeftOut: 0,
    workspaceCut: false,
    descriptionCut: false,
  });
  assert.equal(describePromptBudget(report, "en"), null);
});

test("too many skills are counted as left out, the rest is intact", () => {
  const report = analyzePromptBudget(bot({ skills: 12 }), "en");
  assert.ok(report.overBy > 0);
  assert.ok(report.skillsLeftOut > 0 && report.skillsLeftOut < 12);
  assert.equal(report.workspaceCut, false);
  assert.equal(report.descriptionCut, false);
});

test("a long workspace context is reported cut before the description", () => {
  const report = analyzePromptBudget(
    bot({ workspaceContext: "w".repeat(MAX_SYSTEM_PROMPT_CHARS) }),
    "pt",
  );
  assert.ok(report.overBy > 0);
  assert.equal(report.workspaceCut, true);
  assert.equal(report.descriptionCut, false);
});

test("a huge description is reported cut", () => {
  const report = analyzePromptBudget(
    bot({ description: "d".repeat(MAX_SYSTEM_PROMPT_CHARS + 50) }),
    "en",
  );
  assert.equal(report.descriptionCut, true);
  assert.ok(report.overBy >= 50);
});

test("the reserve of the main bot can tip a near-limit bot over", () => {
  const near = bot({ description: "d".repeat(MAX_SYSTEM_PROMPT_CHARS - 10) });
  assert.equal(analyzePromptBudget(near, "en", 0).overBy, 0);
  const reserve = promptReserveFor(true, "en");
  assert.ok(reserve > 10);
  const report = analyzePromptBudget(near, "en", reserve);
  assert.equal(report.overBy, reserve - 10);
  assert.equal(report.descriptionCut, true);
});

test("the message names what is lost, in both languages", () => {
  const report = analyzePromptBudget(bot({ skills: 12 }), "en");
  const en = describePromptBudget(report, "en");
  const pt = describePromptBudget(report, "pt");
  assert.ok(en && pt);
  assert.match(en.losses[0], /skills will be left out/);
  assert.match(pt.losses[0], /skills ficarão de fora/);
  assert.match(en.overBy, /characters/);
  assert.match(pt.overBy, /caracteres/);
});
