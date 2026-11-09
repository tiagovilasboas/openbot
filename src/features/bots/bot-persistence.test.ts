import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  ACTIVE_BOT_STORAGE_KEY,
  BOTS_STORAGE_KEY,
  createBotProfile,
  deleteBotFromList,
  loadActiveBotId,
  loadBotsFromStorage,
  parseBots,
  saveActiveBotId,
  saveBotsToStorage,
  subscribeActiveBotId,
  subscribeBots,
  updateBotInList,
} from "./bot-storage.ts";
import { DEFAULT_BOT, type BotProfile } from "./bot-types.ts";
import { CREW_PRESETS } from "./crew-presets.ts";
import {
  loadStoredMainBotId,
  mainBotFirst,
  resolveMainBotId,
  saveMainBotId,
  subscribeMainBotId,
} from "./main-bot.ts";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const storage = {
    length: 0,
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: () => null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  } satisfies Storage;
  return { store, storage };
}

function brokenStorage(): Storage {
  const fail = () => {
    throw new Error("storage blocked");
  };
  return {
    length: 0,
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

const win = globalThis as { window?: unknown };
afterEach(() => {
  delete win.window;
});

const bot = (id: string, name = id): BotProfile => ({
  ...DEFAULT_BOT,
  id,
  name,
});

// --- deleteBotFromList -----------------------------------------------------

test("deleting from an empty or single-bot list changes nothing", () => {
  assert.deepEqual(deleteBotFromList([], "x"), { bots: [] });
  const one = [bot("a")];
  const result = deleteBotFromList(one, "a");
  assert.equal(result.bots, one);
  assert.equal(result.newActiveId, undefined);
});

test("the main bot is protected even when it is not first", () => {
  const list = [bot("a"), bot("b"), bot("c")];
  const result = deleteBotFromList(list, "c", "c");
  assert.equal(result.bots, list);
  assert.equal(result.newActiveId, undefined);
});

test("deleting the first bot activates the next one and keeps the order", () => {
  const result = deleteBotFromList([bot("a"), bot("b"), bot("c")], "a", "c");
  assert.deepEqual(
    result.bots.map((b) => b.id),
    ["b", "c"],
  );
  assert.equal(result.newActiveId, "b");
});

test("deleting a bot does not mutate the input list", () => {
  const list = [bot("a"), bot("b")];
  deleteBotFromList(list, "b");
  assert.equal(list.length, 2);
});

test(
  "deleting an id that is not in the list leaves the active bot alone",
  {
    todo: "bug: deleteBotFromList(list, 'ghost') still returns newActiveId = first bot, so removeBot switches the active bot without deleting anything",
  },
  () => {
    const result = deleteBotFromList([bot("a"), bot("b")], "ghost");
    assert.equal(result.bots.length, 2);
    assert.equal(result.newActiveId, undefined);
  },
);

test(
  "deleting a bot that is not the active one keeps the active bot",
  {
    todo: "bug: use-bots removeBot activates nextBots[0] for every delete, so deleting any bot jumps the user to the first bot",
  },
  () => {
    // The pure function has no notion of the active bot; the contract the UI
    // needs is that deleting 'c' while 'b' is active must not report 'a'.
    const result = deleteBotFromList([bot("a"), bot("b"), bot("c")], "c");
    assert.notEqual(result.newActiveId, "a");
  },
);

// --- updateBotInList / ordering -------------------------------------------

test("updateBotInList replaces in place, refreshes updatedAt and keeps the order", () => {
  const list = [bot("a"), bot("b"), bot("c")];
  const next = updateBotInList(list, { ...bot("b"), name: "Renamed" });
  assert.deepEqual(
    next.map((b) => b.id),
    ["a", "b", "c"],
  );
  assert.equal(next[1]?.name, "Renamed");
  assert.notEqual(next[1]?.updatedAt, DEFAULT_BOT.updatedAt);
  assert.equal(list[1]?.name, "b");
});

test("updateBotInList appends an unknown bot unchanged", () => {
  const added = bot("new");
  const next = updateBotInList([bot("a")], added);
  assert.equal(next.length, 2);
  assert.equal(next[1], added);
});

test("mainBotFirst handles empty lists and a missing main id", () => {
  const empty: Array<{ id: string }> = [];
  assert.equal(mainBotFirst(empty, "a"), empty);
  const list = [{ id: "a" }, { id: "b" }];
  assert.equal(mainBotFirst(list, undefined), list);
});

test("mainBotFirst does not mutate the list it reorders", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
  mainBotFirst(list, "c");
  assert.deepEqual(
    list.map((b) => b.id),
    ["a", "b", "c"],
  );
});

// --- resolveMainBotId ------------------------------------------------------

test("resolveMainBotId prefers the stored id, then chief-of-staff, then the legacy default", () => {
  assert.equal(
    resolveMainBotId("zed", [{ id: "default" }, { id: "chief-of-staff" }]),
    "chief-of-staff",
  );
  assert.equal(
    resolveMainBotId(null, [{ id: "x" }, { id: "default" }]),
    "default",
  );
  assert.equal(
    resolveMainBotId("x", [{ id: "x" }, { id: "chief-of-staff" }]),
    "x",
  );
});

test("resolveMainBotId treats an empty stored id as no choice", () => {
  assert.equal(resolveMainBotId("", [{ id: "a" }, { id: "b" }]), "a");
});

// --- parseBots / corrupted JSON -------------------------------------------

test("parseBots falls back to the crew presets on empty, corrupt or wrong-shaped JSON", () => {
  const presets = parseBots(null);
  assert.equal(presets.length, CREW_PRESETS.length);
  for (const raw of ["", "{not json", "null", "42", '"str"', '{"a":1}', "[]"]) {
    assert.deepEqual(
      parseBots(raw).map((b) => b.id),
      presets.map((b) => b.id),
      raw,
    );
  }
});

test("parseBots drops invalid entries but keeps the valid ones", () => {
  const raw = JSON.stringify([
    null,
    42,
    { id: "", name: "x" },
    { id: "ok", name: "Okay" },
    { id: "noname" },
  ]);
  assert.deepEqual(
    parseBots(raw).map((b) => b.id),
    ["ok"],
  );
});

test("parseBots with only invalid entries falls back to the presets", () => {
  const raw = JSON.stringify([null, { id: 1, name: 2 }]);
  assert.equal(parseBots(raw).length, CREW_PRESETS.length);
});

test("legacy ids are upgraded on load: default and OpenBot become the Chief", () => {
  const raw = JSON.stringify([
    { id: "default", name: "Anything" },
    { id: "custom", name: "OpenBot" },
  ]);
  const loaded = parseBots(raw);
  assert.deepEqual(
    loaded.map((b) => [b.id, b.name]),
    [
      [DEFAULT_BOT.id, DEFAULT_BOT.name],
      [DEFAULT_BOT.id, DEFAULT_BOT.name],
    ],
  );
});

test(
  "loaded bots keep unique ids after the legacy upgrade",
  {
    todo: "bug: parseBots does not dedupe, so a stored list with 'default' plus any bot named 'OpenBot' yields two bots with id chief-of-staff",
  },
  () => {
    const raw = JSON.stringify([
      { id: "default", name: "A" },
      { id: "custom", name: "OpenBot" },
    ]);
    const ids = parseBots(raw).map((b) => b.id);
    assert.equal(new Set(ids).size, ids.length);
  },
);

test("an active id of 'default' is read as the Chief's id", () => {
  const { storage } = fakeStorage({ [ACTIVE_BOT_STORAGE_KEY]: "default" });
  assert.equal(loadActiveBotId(storage), DEFAULT_BOT.id);
});

// --- injected storage ------------------------------------------------------

test("load and save round-trip through an injected storage without touching listeners", () => {
  const { storage, store } = fakeStorage();
  let notified = 0;
  const off = subscribeBots(() => notified++);
  const list = [bot("a"), bot("b")];
  saveBotsToStorage(list, storage);
  assert.equal(store.get(BOTS_STORAGE_KEY), JSON.stringify(list));
  assert.deepEqual(
    loadBotsFromStorage(storage).map((b) => b.id),
    ["a", "b"],
  );
  assert.equal(notified, 0);
  off();
});

test("a blocked storage never throws and yields the defaults", () => {
  const blocked = brokenStorage();
  assert.equal(loadBotsFromStorage(blocked).length, CREW_PRESETS.length);
  assert.equal(loadActiveBotId(blocked), DEFAULT_BOT.id);
  assert.doesNotThrow(() => saveBotsToStorage([bot("a")], blocked));
  assert.doesNotThrow(() => saveActiveBotId("a", blocked));
  assert.equal(loadStoredMainBotId(blocked), null);
  assert.doesNotThrow(() => saveMainBotId("a", blocked));
});

test("without a window or a storage the loaders return the defaults", () => {
  assert.equal(loadBotsFromStorage().length, CREW_PRESETS.length);
  assert.equal(loadActiveBotId(), DEFAULT_BOT.id);
  assert.equal(loadStoredMainBotId(), null);
  assert.doesNotThrow(() => saveBotsToStorage([bot("a")]));
});

// --- default (browser) storage: cache and listeners -----------------------

test("with the browser storage a save notifies subscribers and the cache serves the same array", () => {
  const { storage } = fakeStorage();
  win.window = { localStorage: storage };

  let notified = 0;
  const off = subscribeBots(() => notified++);
  const list = [bot("a"), bot("b")];
  saveBotsToStorage(list);
  assert.equal(notified, 1);
  // useSyncExternalStore needs a stable reference between unchanged reads.
  assert.equal(loadBotsFromStorage(), list);
  assert.equal(loadBotsFromStorage(), loadBotsFromStorage());

  off();
  saveBotsToStorage([bot("c")]);
  assert.equal(notified, 1);
});

test("the cache follows external changes to the stored JSON", () => {
  const { storage } = fakeStorage();
  win.window = { localStorage: storage };
  saveBotsToStorage([bot("a")]);

  storage.setItem(BOTS_STORAGE_KEY, JSON.stringify([bot("z", "Zed")]));
  assert.deepEqual(
    loadBotsFromStorage().map((b) => b.id),
    ["z"],
  );

  storage.setItem(BOTS_STORAGE_KEY, "{corrupt");
  assert.equal(loadBotsFromStorage().length, CREW_PRESETS.length);

  storage.removeItem(BOTS_STORAGE_KEY);
  assert.equal(loadBotsFromStorage().length, CREW_PRESETS.length);
});

test("the active bot id is cached, notifies on save and survives removal as the default", () => {
  const { storage } = fakeStorage();
  win.window = { localStorage: storage };
  let notified = 0;
  const off = subscribeActiveBotId(() => notified++);

  saveActiveBotId("bot_1");
  assert.equal(notified, 1);
  assert.equal(loadActiveBotId(), "bot_1");

  storage.setItem(ACTIVE_BOT_STORAGE_KEY, "bot_2");
  assert.equal(loadActiveBotId(), "bot_2");

  storage.removeItem(ACTIVE_BOT_STORAGE_KEY);
  assert.equal(loadActiveBotId(), DEFAULT_BOT.id);
  off();
});

test("the main bot id persists, notifies and can be unsubscribed", () => {
  const { storage } = fakeStorage();
  let notified = 0;
  const off = subscribeMainBotId(() => notified++);
  assert.equal(loadStoredMainBotId(storage), null);
  saveMainBotId("engineering", storage);
  assert.equal(loadStoredMainBotId(storage), "engineering");
  assert.equal(notified, 1);
  off();
  saveMainBotId("security", storage);
  assert.equal(notified, 1);
});

test("a failing write does not notify main-bot subscribers", () => {
  let notified = 0;
  const off = subscribeMainBotId(() => notified++);
  saveMainBotId("a", brokenStorage());
  assert.equal(notified, 0);
  off();
});

test("created bots get unique ids, trimmed names and the default fallbacks", () => {
  const a = createBotProfile({ name: "  Padded  " });
  const b = createBotProfile({ name: "   " });
  assert.notEqual(a.id, b.id);
  assert.equal(a.name, "Padded");
  assert.equal(b.name, "Novo Bot");
  assert.equal(a.avatarShape, "hexagon");
  assert.deepEqual(a.skills, []);
});
