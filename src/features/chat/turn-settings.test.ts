import assert from "node:assert/strict";
import test from "node:test";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { settingsForTurn, type TurnSettings } from "./turn-settings.ts";

const bot = (id: string, name: string) => ({ id, name }) as BotProfile;

function settings(overrides: Partial<TurnSettings>): TurnSettings {
  return {
    language: "pt",
    activeBot: bot("a", "A"),
    bots: [],
    mainBotId: "main",
    gitHubToken: null,
    modelConfig: null,
    contextModel: undefined,
    ...overrides,
  };
}

test("a queued turn reads the model, token, bots and language saved now", () => {
  const latest = settings({
    language: "en",
    gitHubToken: "new",
    contextModel: "m2",
    bots: [bot("a", "A")],
  });
  const turn = settingsForTurn(latest, bot("a", "A"));
  assert.equal(turn.language, "en");
  assert.equal(turn.gitHubToken, "new");
  assert.equal(turn.contextModel, "m2");
  assert.equal(turn.bots.length, 1);
});

test("the turn's bot is replaced by its newer version", () => {
  const latest = settings({ activeBot: bot("a", "A renamed") });
  assert.equal(
    settingsForTurn(latest, bot("a", "A")).activeBot.name,
    "A renamed",
  );
});

test("after a switch to another bot the turn keeps the bot that took it", () => {
  const latest = settings({ activeBot: bot("b", "B") });
  assert.equal(settingsForTurn(latest, bot("a", "A")).activeBot.id, "a");
});
