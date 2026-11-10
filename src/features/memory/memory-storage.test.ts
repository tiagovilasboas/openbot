import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loadMemoryEnabled,
  MEMORY_SWITCH_KEY,
  saveMemoryEnabled,
  subscribeMemoryEnabled,
} from "./memory-setting.ts";
import { memoryTextsForRequest } from "./memory-request.ts";
import {
  deleteBotMemory,
  loadMemoryEntries,
  MEMORY_KEY_PREFIX,
  saveMemoryEntries,
  subscribeMemory,
  type MemoryStorage,
} from "./memory-storage.ts";

class FakeStorage implements MemoryStorage {
  readonly map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const entry = (id: string, text: string) => ({
  id,
  text,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("per-bot memory storage", () => {
  it("saves under one key per bot and reads it back", () => {
    const s = new FakeStorage();
    assert.equal(saveMemoryEntries("bot_a", [entry("1", "one")], s), true);
    assert.ok(s.map.has(`${MEMORY_KEY_PREFIX}bot_a`));
    assert.deepEqual(loadMemoryEntries("bot_a", s), [entry("1", "one")]);
    assert.deepEqual(loadMemoryEntries("bot_b", s), []);
  });

  it("returns a stable snapshot while the stored text is unchanged", () => {
    const s = new FakeStorage();
    saveMemoryEntries("bot_a", [entry("1", "one")], s);
    assert.equal(loadMemoryEntries("bot_a", s), loadMemoryEntries("bot_a", s));
  });

  it("removes the key when the list is empty or the bot is deleted", () => {
    const s = new FakeStorage();
    saveMemoryEntries("bot_a", [entry("1", "one")], s);
    saveMemoryEntries("bot_a", [], s);
    assert.equal(s.map.size, 0);
    saveMemoryEntries("bot_a", [entry("1", "one")], s);
    deleteBotMemory("bot_a", s);
    assert.equal(s.map.size, 0);
  });

  it("re-validates what it reads: corrupt or hostile storage is safe", () => {
    const s = new FakeStorage();
    s.setItem(`${MEMORY_KEY_PREFIX}bad`, "{not json");
    assert.deepEqual(loadMemoryEntries("bad", s), []);
    s.setItem(`${MEMORY_KEY_PREFIX}obj`, '{"text":"x"}');
    assert.deepEqual(loadMemoryEntries("obj", s), []);
    const flood = Array.from({ length: 200 }, (_, i) => ({
      id: `e${i}`,
      text: "f".repeat(2000),
    }));
    s.setItem(`${MEMORY_KEY_PREFIX}big`, JSON.stringify(flood));
    const loaded = loadMemoryEntries("big", s);
    assert.ok(loaded.length <= 30);
    assert.ok(loaded.every((e) => e.text.length <= 300));
  });

  it("reports a blocked storage instead of throwing", () => {
    const blocked: MemoryStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    assert.equal(saveMemoryEntries("a", [entry("1", "x")], blocked), false);
    assert.deepEqual(loadMemoryEntries("a", blocked), []);
  });

  it("tells subscribers of that bot only", () => {
    const s = new FakeStorage();
    let a = 0;
    let b = 0;
    const offA = subscribeMemory("bot_a", () => (a += 1));
    const offB = subscribeMemory("bot_b", () => (b += 1));
    saveMemoryEntries("bot_a", [entry("1", "one")], s);
    assert.deepEqual([a, b], [1, 0]);
    offA();
    offB();
    saveMemoryEntries("bot_a", [], s);
    assert.deepEqual([a, b], [1, 0]);
  });
});

describe("the use-memory switch", () => {
  it("is on by default and off only once the user turns it off", () => {
    const s = new FakeStorage();
    assert.equal(loadMemoryEnabled(s), true);
    saveMemoryEnabled(false, s);
    assert.equal(loadMemoryEnabled(s), false);
    saveMemoryEnabled(true, s);
    assert.equal(loadMemoryEnabled(s), true);
    assert.equal(s.map.has(MEMORY_SWITCH_KEY), false);
  });

  it("lives apart from any bot's memory key", () => {
    assert.ok(!MEMORY_SWITCH_KEY.startsWith(MEMORY_KEY_PREFIX));
    const s = new FakeStorage();
    saveMemoryEnabled(false, s);
    // A bot whose id is "enabled" or "use_memory" cannot collide with it.
    assert.deepEqual(loadMemoryEntries("use_memory", s), []);
  });

  it("notifies subscribers", () => {
    const s = new FakeStorage();
    let calls = 0;
    const off = subscribeMemoryEnabled(() => (calls += 1));
    saveMemoryEnabled(false, s);
    off();
    saveMemoryEnabled(true, s);
    assert.equal(calls, 1);
  });
});

describe("memoryTextsForRequest", () => {
  it("sends the bot's notes while the switch is on, none when off", () => {
    const s = new FakeStorage();
    saveMemoryEntries("bot_a", [entry("1", "one"), entry("2", "two")], s);
    saveMemoryEntries("bot_b", [entry("3", "other bot")], s);
    assert.deepEqual(memoryTextsForRequest("bot_a", s), ["one", "two"]);
    saveMemoryEnabled(false, s);
    assert.deepEqual(memoryTextsForRequest("bot_a", s), []);
  });

  it("is empty where there is no storage at all", () => {
    assert.deepEqual(memoryTextsForRequest("bot_a"), []);
  });
});
