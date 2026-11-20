import assert from "node:assert/strict";
import test from "node:test";
import { LANGUAGES } from "../language/language.ts";
import { botStarters } from "./bot-starters.ts";
import { getStartersCopy } from "./bot-starters-copy.ts";
import type { BotProfile } from "./bot-types.ts";

const skill = { name: "Briefing" } as BotProfile["skills"][number];

test("starters follow the bot's role and first skill", () => {
  const tasks = botStarters(
    { title: "Segurança e Vulnerabilidades", skills: [skill] },
    "pt",
  );
  assert.equal(tasks.length, 3);
  assert.match(tasks[1]!.task, /Segurança e Vulnerabilidades/);
  assert.match(tasks[2]!.task, /Briefing/);
  assert.equal(tasks[2]!.label, "Usar Briefing");
});

test("a bot without role or skills still gets three distinct tasks", () => {
  for (const language of LANGUAGES) {
    const tasks = botStarters({ skills: [] }, language);
    assert.equal(tasks.length, 3);
    assert.equal(new Set(tasks.map((t) => t.task)).size, 3);
    assert.ok(
      tasks.every(
        (t) =>
          t.task.trim() &&
          !t.task.includes("{") &&
          !t.label.includes("{") &&
          t.label.length <= 24,
      ),
    );
  }
});

test("starters are deterministic", () => {
  const bot = { title: "Dev", skills: [skill] };
  assert.deepEqual(botStarters(bot, "en"), botStarters(bot, "en"));
});

test("every language has the same copy keys", () => {
  const keys = Object.keys(getStartersCopy("pt")).sort();
  for (const language of LANGUAGES) {
    assert.deepEqual(Object.keys(getStartersCopy(language)).sort(), keys);
  }
});
