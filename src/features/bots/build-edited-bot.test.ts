import assert from "node:assert/strict";
import test from "node:test";
import { buildEditedBot, type BotEditValues } from "./build-edited-bot.ts";
import type { BotProfile } from "./bot-types.ts";

const values: BotEditValues = {
  name: "  Scout ",
  title: " ",
  description: "",
  workspaceContext: "  repo notes ",
  modelId: " ",
  backupModelIds: [],
  avatarShape: "circle",
  avatarColor: "blue",
  skills: [],
  toolsEnabled: false,
};
const now = new Date("2026-11-16T12:00:00.000Z");
const options = { defaultDescription: "A bot", now, newId: () => "bot_new" };

test("a new bot gets a fresh id, trimmed fields and the default description", () => {
  const bot = buildEditedBot(null, values, options);
  assert.equal(bot.id, "bot_new");
  assert.equal(bot.name, "Scout");
  assert.equal(bot.title, undefined);
  assert.equal(bot.description, "A bot");
  assert.equal(bot.workspaceContext, "repo notes");
  assert.equal(bot.modelId, undefined);
  assert.equal("backupModelIds" in bot, false);
  assert.equal("toolsEnabled" in bot, false);
  assert.equal(bot.createdAt, now.toISOString());
});

test("an edited bot keeps its id, creation date and hidden flag", () => {
  const existing = {
    id: "scout",
    hidden: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  } as BotProfile;
  const bot = buildEditedBot(
    existing,
    { ...values, backupModelIds: ["b/one"], toolsEnabled: true },
    options,
  );
  assert.equal(bot.id, "scout");
  assert.equal(bot.hidden, true);
  assert.equal(bot.createdAt, "2026-01-01T00:00:00.000Z");
  assert.equal(bot.updatedAt, now.toISOString());
  assert.deepEqual(bot.backupModelIds, ["b/one"]);
  assert.equal(bot.toolsEnabled, true);
});
