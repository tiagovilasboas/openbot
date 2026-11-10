import assert from "node:assert/strict";
import test from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { buildBotTemplateFile } from "./build-bot-template-file.ts";
import { parseBotTemplateFile } from "./parse-bot-template-file.ts";

const bot: BotProfile = {
  id: "bot_123",
  name: "Coder",
  description: "You write code.",
  modelId: "vendor/own:free",
  avatarShape: "hexagon",
  avatarColor: "violet",
  skills: [],
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-03T00:00:00.000Z",
};

function fileWith(modelId: unknown): string {
  const built = buildBotTemplateFile(bot);
  return JSON.stringify({ ...built, bot: { ...built.bot, modelId } });
}

test("the template file carries the bot's modelId and parses it back", () => {
  const built = buildBotTemplateFile(bot);
  assert.equal(built.bot.modelId, "vendor/own:free");
  const parsed = parseBotTemplateFile(JSON.stringify(built));
  assert.ok(parsed.ok);
  assert.equal(parsed.draft.modelId, "vendor/own:free");
});

test("the template file leaves modelId out when the bot has none", () => {
  const built = buildBotTemplateFile({ ...bot, modelId: undefined });
  assert.ok(!("modelId" in built.bot));
  const parsed = parseBotTemplateFile(JSON.stringify(built));
  assert.ok(parsed.ok);
  assert.ok(!("modelId" in parsed.draft));
});

test("a malformed modelId in a template file is dropped from the draft", () => {
  for (const modelId of ["two words", 12, "x".repeat(101), "a;b"]) {
    const parsed = parseBotTemplateFile(fileWith(modelId));
    assert.ok(parsed.ok);
    assert.ok(!("modelId" in parsed.draft), JSON.stringify(modelId));
  }
});
