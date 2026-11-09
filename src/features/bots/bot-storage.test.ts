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
import { createCustomSkill } from "../skills/skill-definition.ts";
import { BOT_NAME_MAX_LENGTH, DEFAULT_BOT } from "./bot-types.ts";
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
  assert.equal(new Set(bots.map((b) => b.id)).size, 9);
  assert.equal(bots[0]?.avatarShape, "ghost");
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

test("crew presets start without skills of their own", () => {
  for (const bot of CREW_PRESETS) {
    assert.deepEqual(bot.skills, [], bot.id);
  }
});

test("sanitizeBotProfile keeps a bot's own skills and drops invalid ones", () => {
  const own = {
    id: "skill_1",
    name: "Review",
    command: "/review",
    instructions: "Find bugs.",
  };
  const bot = sanitizeBotProfile({
    id: "b1",
    name: "Reviewer",
    skills: [own, { id: "", name: "No id" }, 42],
  });
  assert.deepEqual(
    bot?.skills.map((s) => [s.id, s.command]),
    [["skill_1", "/review"]],
  );
});

test("sanitizeBotProfile resolves old library ids and drops unknown ones", () => {
  const library = [
    createCustomSkill({ name: "Briefing", instructions: "Summarise." }),
  ];
  const bot = sanitizeBotProfile(
    { id: "b1", name: "Old", skills: [library[0]!.id, "skill_gone"] },
    library,
  );
  assert.deepEqual(bot?.skills, library);
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
  assert.equal(legacy.avatarShape, "ghost");
  assert.equal(legacy.avatarColor, "teal");
});

test("sanitizeBotProfile migrates legacy shapes and falls back to the ghost", () => {
  const table: Record<string, string> = {
    head: "circle",
    hex: "hexagon",
    tablet: "square",
    gem: "pentagon",
    shield: "shield",
    wedge: "triangle",
    pebble: "circle",
    capsule: "egg",
    diamond: "ghost",
    cloud: "cloud",
    egg: "egg",
    square: "square",
    nope: "ghost",
  };
  for (const [stored, expected] of Object.entries(table)) {
    const bot = sanitizeBotProfile({
      id: "bot_m",
      name: "Migrated",
      avatarShape: stored,
    });
    assert.equal(bot?.avatarShape, expected, stored);
  }
  assert.equal(
    sanitizeBotProfile({ id: "bot_n", name: "No shape" })?.avatarShape,
    "ghost",
  );
  assert.equal(
    sanitizeBotProfile({
      id: "bot_p",
      name: "Proto",
      avatarShape: "constructor",
    })?.avatarShape,
    "ghost",
  );
});

test("sanitizeBotProfile accepts new colors", () => {
  for (const color of ["teal", "sky", "pink", "gold"]) {
    const bot = sanitizeBotProfile({
      id: "bot_h",
      name: "Color Bot",
      avatarColor: color,
    });
    assert.equal(bot?.avatarColor, color);
  }
});

test("crew presets use distinct art shapes with their palette colours", () => {
  const identity = CREW_PRESETS.map((b) => `${b.avatarShape}/${b.avatarColor}`);
  assert.deepEqual(identity, [
    "ghost/teal",
    "square/blue",
    "circle/yellow",
    "shield/red",
    "flower/violet",
    "triangle/green",
    "clover/gold",
    "dumpling/sky",
    "cloud/pink",
  ]);
  assert.equal(new Set(CREW_PRESETS.map((b) => b.avatarShape)).size, 9);
  assert.equal(DEFAULT_BOT.avatarShape, "ghost");
  assert.equal(DEFAULT_BOT.avatarColor, "teal");
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
  assert.equal(valid.avatarShape, "pentagon");
  assert.equal(valid.avatarColor, "violet");
  // "github" was a built-in skill id; with no library to resolve it, it goes.
  assert.deepEqual(valid.skills, []);

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

test("bot names are cut to the shared limit on load and on create", () => {
  const long = "A".repeat(204);
  const loaded = sanitizeBotProfile({ id: "x", name: long });
  assert.equal(loaded?.name.length, BOT_NAME_MAX_LENGTH);
  assert.equal(BOT_NAME_MAX_LENGTH, 40);
  assert.equal(
    createBotProfile({ name: long }).name.length,
    BOT_NAME_MAX_LENGTH,
  );
});
