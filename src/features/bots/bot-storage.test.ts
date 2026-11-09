import assert from "node:assert/strict";
import test from "node:test";
import { findMentionedBot } from "../chat/find-mentioned-bot.ts";
import {
  createBotProfile,
  deleteBotFromList,
  loadActiveBotId,
  loadBotsFromStorage,
  sanitizeBotProfile,
  saveActiveBotId,
  saveBotsToStorage,
  updateBotInList,
} from "./bot-storage.ts";
import { DEFAULT_BOT } from "./bot-types.ts";
import { CREW_PRESETS } from "./crew-presets.ts";

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    length: 0,
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: () => null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

test("loadBotsFromStorage returns the crew presets on empty storage", () => {
  const storage = createMockStorage();
  const bots = loadBotsFromStorage(storage);
  assert.equal(bots.length, 9);
  assert.equal(bots[0]?.id, "chief-of-staff");
  assert.equal(bots[0]?.name, DEFAULT_BOT.name);
  assert.ok(bots.every((b) => b.avatarShape === "head"));
  assert.equal(new Set(bots.map((b) => b.id)).size, 9);
  assert.equal(bots[0]?.avatarShape, "head");
  assert.equal(bots[0]?.avatarColor, "teal");
});

test("loadBotsFromStorage preserves stored bots without adding presets", () => {
  const storage = createMockStorage();
  const mine = createBotProfile({ name: "Mine" });
  saveBotsToStorage([mine], storage);
  const bots = loadBotsFromStorage(storage);
  assert.equal(bots.length, 1);
  assert.equal(bots[0]?.id, mine.id);
});

test("crew preset skills all resolve to built-in skills", () => {
  const valid = new Set(["github", "calendar", "summary"]);
  for (const bot of CREW_PRESETS) {
    assert.ok(
      bot.skills.every((s) => valid.has(s)),
      bot.id,
    );
  }
});

test("sanitizeBotProfile upgrades legacy OpenBot default to Chief of Staff", () => {
  const legacy = sanitizeBotProfile({
    id: "default",
    name: "OpenBot",
    title: "Assistente Geral",
    avatarShape: "hex",
  });
  assert.ok(legacy);
  assert.equal(legacy.id, "chief-of-staff");
  assert.equal(legacy.name, "Chief of Staff");
  assert.equal(legacy.title, "Manager & Orquestrador");
  assert.equal(legacy.avatarShape, "head");
  assert.equal(legacy.avatarColor, "teal");
});

test("sanitizeBotProfile accepts head shape and new colors, keeps non-default shapes", () => {
  for (const color of ["teal", "sky", "pink"]) {
    const bot = sanitizeBotProfile({
      id: "bot_h",
      name: "Head Bot",
      avatarShape: "head",
      avatarColor: color,
    });
    assert.equal(bot?.avatarShape, "head");
    assert.equal(bot?.avatarColor, color);
  }
  const kept = sanitizeBotProfile({
    id: "bot_s",
    name: "Shield Bot",
    avatarShape: "shield",
    avatarColor: "cyan",
  });
  assert.equal(kept?.avatarShape, "shield");
  assert.equal(kept?.avatarColor, "cyan");
  const unknown = sanitizeBotProfile({
    id: "bot_u",
    name: "Odd",
    avatarShape: "nope",
  });
  assert.equal(unknown?.avatarShape, "hex");
});

test("sanitizeBotProfile validates fields and falls back to safe defaults", () => {
  const valid = sanitizeBotProfile({
    id: "bot_123",
    name: "Eng Bot",
    avatarShape: "gem",
    avatarColor: "violet",
    skills: ["github"],
  });
  assert.ok(valid);
  assert.equal(valid.name, "Eng Bot");
  assert.equal(valid.avatarShape, "gem");
  assert.equal(valid.avatarColor, "violet");
  assert.deepEqual(valid.skills, ["github"]);

  const invalid = sanitizeBotProfile({ id: "", name: "" });
  assert.equal(invalid, null);
});

test("createBotProfile generates unique bot profile", () => {
  const bot = createBotProfile({
    name: "Research Bot",
    description: "Pesquisa na web e GitHub",
    avatarShape: "cloud",
    avatarColor: "blue",
  });
  assert.ok(bot.id.startsWith("bot_"));
  assert.equal(bot.name, "Research Bot");
  assert.equal(bot.avatarShape, "cloud");
  assert.equal(bot.avatarColor, "blue");
});

test("updateBotInList and deleteBotFromList maintain integrity", () => {
  const b1 = DEFAULT_BOT;
  const b2 = createBotProfile({ name: "Second Bot" });
  let list = [b1, b2];

  const updatedB2 = { ...b2, name: "Second Bot Updated" };
  list = updateBotInList(list, updatedB2);
  assert.equal(list.find((b) => b.id === b2.id)?.name, "Second Bot Updated");

  // Deleting one bot
  const delResult = deleteBotFromList(list, b2.id);
  assert.equal(delResult.bots.length, 1);
  assert.equal(delResult.newActiveId, b1.id);

  // Attempting to delete last remaining bot is prevented
  const delLast = deleteBotFromList(delResult.bots, b1.id);
  assert.equal(delLast.bots.length, 1);
});

test("active bot ID persistence works", () => {
  const storage = createMockStorage();
  assert.equal(loadActiveBotId(storage), DEFAULT_BOT.id);
  saveActiveBotId("bot_xyz", storage);
  assert.equal(loadActiveBotId(storage), "bot_xyz");
});

test("findMentionedBot correctly resolves @bot mentions", () => {
  const chief = DEFAULT_BOT;
  const reviewer = {
    ...createBotProfile({ name: "Code Reviewer" }),
    id: "bot_reviewer",
  };
  const bots = [chief, reviewer];

  // Match by exact or normalized name
  assert.equal(
    findMentionedBot("@CodeReviewer revise isso", bots)?.id,
    reviewer.id,
  );
  assert.equal(
    findMentionedBot("@code-reviewer faça o review", bots)?.id,
    reviewer.id,
  );
  assert.equal(
    findMentionedBot("Olá @ChiefofStaff pode me ajudar?", bots)?.id,
    chief.id,
  );

  // Match by id
  assert.equal(findMentionedBot("@bot_reviewer olá", bots)?.id, reviewer.id);

  // Return null when bot is not found or no mention is present
  assert.equal(findMentionedBot("@desconhecido faça isso", bots), null);
  assert.equal(findMentionedBot("apenas uma mensagem comum", bots), null);
});
