import assert from "node:assert/strict";
import test from "node:test";
import {
  sanitizeSkill,
  sanitizeSkillList,
} from "../skills/skill-definition.ts";
import {
  SKILL_ID_MAX_LENGTH,
  SKILL_LABEL_MAX_LENGTH,
  SKILL_TEXT_MAX_LENGTH,
  SKILLS_MAX_COUNT,
} from "../skills/skill-types.ts";
import { parseBots, sanitizeBotProfile } from "./bot-storage.ts";
import {
  BOT_LABEL_MAX_LENGTH,
  BOT_TEXT_MAX_LENGTH,
  BOTS_MAX_COUNT,
} from "./bot-types.ts";

const bot = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: "Bot",
  description: "d",
  avatarShape: "hexagon",
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const skill = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: "Skill",
  instructions: "do it",
  ...extra,
});

test("a stored bot's text fields are cut to their ceilings", () => {
  const result = sanitizeBotProfile(
    bot("big", {
      title: "t".repeat(10_000),
      description: "d".repeat(500_000),
      workspaceContext: "w".repeat(500_000),
      createdAt: "c".repeat(10_000),
      updatedAt: "u".repeat(10_000),
    }),
  );
  assert.ok(result);
  assert.equal(result.title?.length, BOT_LABEL_MAX_LENGTH);
  assert.equal(result.description.length, BOT_TEXT_MAX_LENGTH);
  assert.equal(result.workspaceContext?.length, BOT_TEXT_MAX_LENGTH);
  assert.ok(result.createdAt.length <= 40);
  assert.ok(result.updatedAt.length <= 40);
});

test("a stored list keeps at most the allowed number of bots", () => {
  const many = Array.from({ length: BOTS_MAX_COUNT + 50 }, (_, i) =>
    bot(`bot_${i}`),
  );
  assert.equal(parseBots(JSON.stringify(many)).length, BOTS_MAX_COUNT);
});

test("a stored bot keeps at most the allowed number of skills", () => {
  const skills = Array.from({ length: SKILLS_MAX_COUNT + 20 }, (_, i) =>
    skill(`s${i}`),
  );
  const result = sanitizeBotProfile(bot("many", { skills }));
  assert.equal(result?.skills.length, SKILLS_MAX_COUNT);
});

test("a stored skill's fields are cut to their ceilings", () => {
  const result = sanitizeSkill(
    skill("s1", {
      name: "n".repeat(10_000),
      description: "d".repeat(500_000),
      instructions: "i".repeat(500_000),
      command: "c".repeat(10_000),
      createdAt: "x".repeat(10_000),
    }),
  );
  assert.ok(result);
  assert.equal(result.name.length, SKILL_LABEL_MAX_LENGTH);
  assert.equal(result.description.length, SKILL_TEXT_MAX_LENGTH);
  assert.equal(result.instructions.length, SKILL_TEXT_MAX_LENGTH);
  assert.ok(result.command.length <= 64);
  assert.ok(result.createdAt.length <= 40);
});

test("a skill with an oversized id is dropped, a normal one stays", () => {
  assert.equal(sanitizeSkill(skill("i".repeat(SKILL_ID_MAX_LENGTH + 1))), null);
  assert.ok(sanitizeSkill(skill("skill_1730000000000_ab12")));
});

test("a skill list is cut before it is sanitized", () => {
  const list = Array.from({ length: SKILLS_MAX_COUNT * 10 }, (_, i) =>
    skill(`s${i}`),
  );
  assert.equal(sanitizeSkillList(list).length, SKILLS_MAX_COUNT);
});

test("ordinary stored data is not changed by the ceilings", () => {
  const result = sanitizeBotProfile(
    bot("bot_1_abc", {
      description: "You help.",
      workspaceContext: "House rules",
      skills: [skill("s1", { command: "/review", description: "when" })],
    }),
  );
  assert.equal(result?.description, "You help.");
  assert.equal(result?.workspaceContext, "House rules");
  assert.equal(result?.skills[0]?.command, "/review");
  assert.equal(result?.skills[0]?.description, "when");
});
