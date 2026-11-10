import assert from "node:assert/strict";
import test from "node:test";
import { crewCopy } from "../crew/crew-copy.ts";
import { MAX_SYSTEM_PROMPT_CHARS } from "../model/system-prompt-limit.ts";
import { parseChatRequest } from "../model/parse-chat-request.ts";
import { createCustomSkill } from "../skills/skill-definition.ts";
import { buildSkillsBlock } from "../skills/skill-prompt-block.ts";
import { buildBotSystemPrompt } from "./bot-system-prompt.ts";
import { createBotProfile } from "./bot-storage.ts";

function bot(over: {
  description?: string;
  workspaceContext?: string;
  skills?: number;
  thirdParty?: number;
}) {
  const profile = createBotProfile({
    name: "Big",
    description: over.description ?? "You help.",
  });
  profile.workspaceContext = over.workspaceContext;
  const make = (i: number, source: "created" | "imported") =>
    createCustomSkill({
      name: `Skill${i}`,
      command: `/s${i}`,
      instructions: `do thing ${i} `.repeat(150),
      source,
    });
  profile.skills = [
    ...Array.from({ length: over.skills ?? 0 }, (_, i) => make(i, "created")),
    ...Array.from({ length: over.thirdParty ?? 0 }, (_, i) =>
      make(100 + i, "imported"),
    ),
  ];
  return profile;
}

const rules = crewCopy.pt.synthesisRule;

test("a long bot leaves room for the rules that follow it", () => {
  const prompt = buildBotSystemPrompt(
    bot({ description: "d".repeat(9000), workspaceContext: "w".repeat(9000) }),
    "pt",
    rules.length + 2,
  );
  const full = `${prompt}\n\n${rules}`;
  assert.ok(full.length <= MAX_SYSTEM_PROMPT_CHARS);
  assert.ok(full.endsWith(rules), "the rules were cut off");
});

test("skills go first, whole, and the delimiter is never cut in half", () => {
  const prompt = buildBotSystemPrompt(
    bot({ skills: 5, thirdParty: 5 }),
    "en",
    1500,
  );
  assert.ok(prompt.length + 1500 <= MAX_SYSTEM_PROMPT_CHARS);
  const opens = prompt.split("<external-data>").length - 1;
  const closes = prompt.split("</external-data>").length - 1;
  assert.equal(opens, closes, "an external-data block was split");
  assert.ok(
    prompt.includes("Skill0"),
    "own skills should outlast imported ones",
  );
});

test("a bot that fits is left exactly as it was", () => {
  const small = bot({
    description: "You help.",
    workspaceContext: "Notes",
    skills: 1,
  });
  const prompt = buildBotSystemPrompt(small, "en", 500);
  assert.ok(prompt.startsWith("You help."));
  assert.ok(prompt.includes("Notes"));
  assert.ok(prompt.includes("Skill0"));
  assert.ok(!prompt.includes("…"));
});

test("the description is the last thing to be cut, and says so", () => {
  const prompt = buildBotSystemPrompt(
    bot({ description: "d".repeat(20000), workspaceContext: "w", skills: 2 }),
    "pt",
    3000,
  );
  assert.equal(prompt.length, MAX_SYSTEM_PROMPT_CHARS - 3000);
  assert.ok(prompt.endsWith("…"));
});

test("buildSkillsBlock drops imported skills before the user's own", () => {
  const profile = bot({ skills: 2, thirdParty: 2 });
  const full = buildSkillsBlock(profile.skills, "en");
  const fit = buildSkillsBlock(profile.skills, "en", full.length - 10);
  assert.ok(fit.length <= full.length - 10);
  assert.ok(fit.includes("Skill0") && fit.includes("Skill1"));
  assert.ok(!fit.includes("Skill101"));
});

test("the server refuses an over-long system prompt instead of cutting it", () => {
  const base = {
    language: "en",
    messages: [{ role: "user", text: "hi" }],
  };
  const fits = "p".repeat(MAX_SYSTEM_PROMPT_CHARS);
  const result = parseChatRequest({ ...base, systemPrompt: fits });
  assert.ok(result.ok);
  assert.equal(result.request.systemPrompt?.length, MAX_SYSTEM_PROMPT_CHARS);
  assert.deepEqual(parseChatRequest({ ...base, systemPrompt: `${fits}x` }), {
    ok: false,
  });
});

test("a prompt of 5000 characters (over the old 4000 cut) reaches the server whole", () => {
  const prompt = `${"a".repeat(4900)}\n\nTEAM ROSTER AND DELEGATION RULES`;
  const result = parseChatRequest({
    language: "en",
    messages: [{ role: "user", text: "hi" }],
    systemPrompt: prompt,
  });
  assert.ok(result.ok);
  assert.ok(result.request.systemPrompt?.endsWith("DELEGATION RULES"));
});
