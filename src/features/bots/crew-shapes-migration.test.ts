import assert from "node:assert/strict";
import test from "node:test";
import { BOTS_STORAGE_KEY, loadBotsFromStorage } from "./bot-storage.ts";
import {
  CREW_SHAPE_ROUNDS,
  migrateCrewShapes,
  updateCrewShapes,
} from "./crew-shapes-migration.ts";
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

/** The crew as an older version saved it. */
function oldCrew(overrides: Record<string, string> = {}) {
  const shapes: Record<string, string> = {
    "chief-of-staff": "hexagon",
    inbox: "diamond",
    finance: "pentagon",
    product: "egg",
    security: "octagon",
    ...overrides,
  };
  return JSON.stringify(
    CREW_PRESETS.map((bot) => ({
      ...bot,
      avatarShape: shapes[bot.id] ?? bot.avatarShape,
    })),
  );
}

const shapeOf = (storage: Storage, id: string) =>
  loadBotsFromStorage(storage).find((b) => b.id === id)?.avatarShape;

test("migrateCrewShapes gives a saved crew its new heads", () => {
  const storage = createMockStorage();
  storage.setItem(BOTS_STORAGE_KEY, oldCrew());

  assert.equal(migrateCrewShapes(storage), true);
  assert.equal(shapeOf(storage, "chief-of-staff"), "ghost");
  assert.equal(shapeOf(storage, "inbox"), "flower");
  assert.equal(shapeOf(storage, "finance"), "clover");
  assert.equal(shapeOf(storage, "product"), "dumpling");
  assert.equal(shapeOf(storage, "security"), "shield");
  assert.equal(shapeOf(storage, "engineering"), "square");
});

test("migrateCrewShapes keeps a shape the user picked", () => {
  const storage = createMockStorage();
  storage.setItem(BOTS_STORAGE_KEY, oldCrew({ finance: "cloud" }));

  migrateCrewShapes(storage);
  assert.equal(shapeOf(storage, "finance"), "cloud");
  assert.equal(shapeOf(storage, "chief-of-staff"), "ghost");
});

test("migrateCrewShapes runs once", () => {
  const storage = createMockStorage();
  storage.setItem(BOTS_STORAGE_KEY, oldCrew());
  migrateCrewShapes(storage);
  for (const round of CREW_SHAPE_ROUNDS) {
    assert.equal(storage.getItem(round.key), "1");
  }

  // A shape picked after the migration is never moved again.
  storage.setItem(BOTS_STORAGE_KEY, oldCrew());
  assert.equal(migrateCrewShapes(storage), false);
  assert.equal(shapeOf(storage, "chief-of-staff"), "hexagon");
});

test("migrateCrewShapes runs only the rounds a browser has not run", () => {
  const storage = createMockStorage();
  storage.setItem(CREW_SHAPE_ROUNDS[0]!.key, "1");
  // The Chief kept a hexagon the user picked after the first round.
  storage.setItem(BOTS_STORAGE_KEY, oldCrew());

  assert.equal(migrateCrewShapes(storage), true);
  assert.equal(shapeOf(storage, "chief-of-staff"), "hexagon");
  assert.equal(shapeOf(storage, "security"), "shield");
});

test("migrateCrewShapes leaves a fresh browser alone", () => {
  const storage = createMockStorage();
  assert.equal(migrateCrewShapes(storage), false);
  assert.equal(storage.getItem(BOTS_STORAGE_KEY), null);
});

test("updateCrewShapes ignores custom bots with crew shapes", () => {
  const custom = { ...CREW_PRESETS[0]!, id: "bot_x", avatarShape: "hexagon" };
  const [bot] = updateCrewShapes(
    [custom as (typeof CREW_PRESETS)[number]],
    CREW_SHAPE_ROUNDS[0]!.changes,
  );
  assert.equal(bot, custom);
});
