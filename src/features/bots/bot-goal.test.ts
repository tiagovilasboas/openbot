import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openLocalStore } from "../../shared/local-store/local-store.ts";
import {
  buildGoal,
  GOAL_TITLE_MAX_LENGTH,
  goalToDraft,
  sanitizeGoal,
  type BotGoal,
} from "./bot-goal.ts";
import { buildGoalBlock } from "./bot-goal-prompt.ts";
import { buildBotSystemPrompt } from "./bot-system-prompt.ts";
import { DEFAULT_BOT, type BotProfile } from "./bot-types.ts";
import { buildEditedBot } from "./build-edited-bot.ts";
import { listBots, replaceBots } from "./server/bots-repository.ts";
import { validateBotsWrite } from "./server/validate-bots-write.ts";

const goal: BotGoal = {
  title: "Ship the report",
  description: "Quarterly numbers",
  status: "active",
  progress: "Data collected",
  updatedAt: "2026-11-20T10:00:00.000Z",
};

test("sanitizeGoal keeps a valid goal and trims and caps its text", () => {
  assert.deepEqual(
    sanitizeGoal({ ...goal, title: "  Ship the report " }),
    goal,
  );
  const long = sanitizeGoal({ ...goal, title: "x".repeat(500) });
  assert.equal(long?.title.length, GOAL_TITLE_MAX_LENGTH);
});

test("sanitizeGoal drops goals without a title and defaults a bad status", () => {
  assert.equal(sanitizeGoal(null), undefined);
  assert.equal(sanitizeGoal("goal"), undefined);
  assert.equal(sanitizeGoal({ ...goal, title: "   " }), undefined);
  assert.equal(sanitizeGoal({ ...goal, status: "weird" })?.status, "active");
});

test("buildGoal clears on an empty title and keeps the date when unchanged", () => {
  const now = new Date("2026-11-25T00:00:00.000Z");
  assert.equal(
    buildGoal({ ...goalToDraft(goal), title: " " }, goal, now),
    undefined,
  );
  assert.equal(buildGoal(goalToDraft(goal), goal, now), goal);
  const paused = buildGoal(
    { ...goalToDraft(goal), status: "paused" },
    goal,
    now,
  );
  assert.equal(paused?.status, "paused");
  assert.equal(paused?.updatedAt, now.toISOString());
});

test("buildEditedBot carries the goal and drops it when cleared", () => {
  const values = {
    name: "A",
    title: "",
    description: "d",
    workspaceContext: "",
    modelId: "",
    backupModelIds: [],
    avatarShape: "circle" as const,
    avatarColor: "blue" as const,
    skills: [],
    toolsEnabled: false,
  };
  const options = { defaultDescription: "x" };
  assert.deepEqual(
    buildEditedBot(null, { ...values, goal }, options).goal,
    goal,
  );
  assert.equal("goal" in buildEditedBot(null, values, options), false);
});

test("an active goal is injected into the prompt in every language", () => {
  const bot: BotProfile = { ...DEFAULT_BOT, description: "You help.", goal };
  for (const [language, head] of [
    ["pt", "Seu objetivo atual:"],
    ["en", "Your current goal:"],
    ["es", "Tu objetivo actual:"],
  ] as const) {
    const prompt = buildBotSystemPrompt(bot, language);
    assert.match(
      prompt,
      new RegExp(`You help\\.\\n\\n${head}\\nShip the report`),
    );
    assert.match(prompt, /Quarterly numbers\n.+: Data collected/);
  }
});

test("paused, done and absent goals add nothing to the prompt", () => {
  const base: BotProfile = { ...DEFAULT_BOT, description: "You help." };
  const plain = buildBotSystemPrompt(base, "en");
  for (const status of ["paused", "done"] as const) {
    const bot = { ...base, goal: { ...goal, status } };
    assert.equal(buildBotSystemPrompt(bot, "en"), plain);
  }
  assert.equal(buildGoalBlock(undefined, "en", 1000), "");
});

test("the goal block is cut to its room", () => {
  const block = buildGoalBlock(goal, "en", 20);
  assert.equal(block.length, 20);
  assert.ok(block.endsWith("…"));
  assert.equal(buildGoalBlock(goal, "en", 0), "");
});

test("a goal survives the server write, the store and a re-read", () => {
  const dir = mkdtempSync(join(tmpdir(), "openbot-goal-"));
  const db = openLocalStore(dir);
  try {
    const written = validateBotsWrite([
      { ...DEFAULT_BOT, goal, description: "You help." },
    ]);
    assert.ok(written.ok);
    replaceBots(db, written.bots);
    assert.deepEqual(listBots(db)[0]?.goal, goal);
    const cleared = validateBotsWrite([
      { ...DEFAULT_BOT, goal: { title: "" } },
    ]);
    assert.ok(cleared.ok);
    assert.equal("goal" in cleared.bots[0]!, false);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
