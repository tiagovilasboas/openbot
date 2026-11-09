import assert from "node:assert/strict";
import { test } from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import type { SkillDefinition } from "../skills/skill-types.ts";
import {
  applyBotMention,
  applySkillCommand,
  filterBots,
  filterSkills,
  parseMentionQuery,
  parseSlashQuery,
} from "./palette-query.ts";

const skill: SkillDefinition = {
  id: "github",
  name: "GitHub",
  description: "Lists repository issues",
  instructions: "",
  command: "/github",
  isBuiltin: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const bot: BotProfile = {
  id: "writer",
  name: "Writer",
  title: "Copy editor",
  description: "",
  avatarShape: "hexagon",
  avatarColor: "cerulean",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("slash query is only read while the command has no whitespace", () => {
  assert.equal(parseSlashQuery("/"), "");
  assert.equal(parseSlashQuery("/git"), "git");
  assert.equal(parseSlashQuery("/github "), null);
  assert.equal(parseSlashQuery("hello /git"), null);
});

test("mention query reads the trailing @token only", () => {
  assert.equal(parseMentionQuery("@"), "");
  assert.equal(parseMentionQuery("ask @wri"), "wri");
  assert.equal(parseMentionQuery("mail me@host"), null);
  assert.equal(parseMentionQuery("@Writer "), null);
});

test("filters match name, command, title and id", () => {
  assert.deepEqual(filterSkills([skill], "/git"), [skill]);
  assert.deepEqual(filterSkills([skill], "issues"), [skill]);
  assert.deepEqual(filterSkills([skill], "agenda"), []);
  assert.deepEqual(filterBots([bot], ""), [bot]);
  assert.deepEqual(filterBots([bot], "copy"), [bot]);
  assert.deepEqual(filterBots([bot], "zzz"), []);
});

test("selecting a skill replaces the typed command and keeps the text", () => {
  assert.equal(applySkillCommand("/gi", skill), "/github ");
  assert.equal(applySkillCommand("/old keep this", skill), "/github keep this");
  assert.equal(
    applySkillCommand("  review this", skill),
    "/github review this",
  );
  assert.equal(applySkillCommand("", skill), "/github ");
});

test("selecting a bot completes the mention or appends one", () => {
  assert.equal(applyBotMention("ask @wr", bot), "ask @Writer ");
  assert.equal(applyBotMention("draft text ", bot), "draft text @Writer ");
  assert.equal(applyBotMention("   ", bot), "@Writer ");
});
