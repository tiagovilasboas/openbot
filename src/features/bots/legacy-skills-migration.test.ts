import assert from "node:assert/strict";
import test from "node:test";
import { createCustomSkill } from "../skills/skill-definition.ts";
import {
  BOTS_STORAGE_KEY,
  createBotProfile,
  loadBotsFromStorage,
} from "./bot-storage.ts";
import { DEFAULT_BOT } from "./bot-types.ts";
import {
  adoptLegacySkills,
  LEGACY_SKILLS_KEY,
  migrateLegacySkills,
} from "./legacy-skills-migration.ts";

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

const review = createCustomSkill({ name: "Review", instructions: "Bugs." });
const brief = createCustomSkill({ name: "Brief", instructions: "Summarise." });

/** Bots as they were stored before: skills held library ids. */
function storedWithIds(...bots: Array<{ id: string; skills: string[] }>) {
  return JSON.stringify(
    bots.map(({ id, skills }) => ({
      ...createBotProfile({ name: id }),
      id,
      skills,
    })),
  );
}

test("adoptLegacySkills copies each switched-on skill into its bot", () => {
  const raw = storedWithIds(
    { id: DEFAULT_BOT.id, skills: [] },
    { id: "coder", skills: [review.id] },
  );
  const bots = adoptLegacySkills(raw, [review]);
  assert.deepEqual(bots.find((b) => b.id === "coder")?.skills, [review]);
  assert.deepEqual(bots.find((b) => b.id === DEFAULT_BOT.id)?.skills, []);
});

test("adoptLegacySkills gives skills no bot had to the Chief of Staff", () => {
  const raw = storedWithIds(
    { id: "coder", skills: [review.id] },
    { id: DEFAULT_BOT.id, skills: [] },
  );
  const bots = adoptLegacySkills(raw, [review, brief]);
  assert.deepEqual(bots.find((b) => b.id === DEFAULT_BOT.id)?.skills, [brief]);
  assert.deepEqual(bots.find((b) => b.id === "coder")?.skills, [review]);
});

test("adoptLegacySkills falls back to the first bot without a Chief of Staff", () => {
  const raw = storedWithIds({ id: "solo", skills: [] });
  const bots = adoptLegacySkills(raw, [brief]);
  assert.deepEqual(bots[0]?.skills, [brief]);
});

test("migrateLegacySkills moves the library into the bots and removes it", () => {
  const storage = createMockStorage();
  storage.setItem(
    BOTS_STORAGE_KEY,
    storedWithIds({ id: "coder", skills: [review.id] }),
  );
  storage.setItem(LEGACY_SKILLS_KEY, JSON.stringify([review]));

  assert.equal(migrateLegacySkills(storage), true);
  assert.equal(storage.getItem(LEGACY_SKILLS_KEY), null);
  const [coder] = loadBotsFromStorage(storage);
  assert.deepEqual(coder?.skills, [review]);

  // Nothing left to move the second time.
  assert.equal(migrateLegacySkills(storage), false);
});

test("migrateLegacySkills drops a corrupt library without touching the bots", () => {
  const storage = createMockStorage();
  const before = storedWithIds({ id: "coder", skills: [] });
  storage.setItem(BOTS_STORAGE_KEY, before);
  storage.setItem(LEGACY_SKILLS_KEY, "{not json");

  assert.equal(migrateLegacySkills(storage), true);
  assert.equal(storage.getItem(LEGACY_SKILLS_KEY), null);
  assert.equal(storage.getItem(BOTS_STORAGE_KEY), before);
});
