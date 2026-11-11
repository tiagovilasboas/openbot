import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  forgetBotAttention,
  saveAttention,
  storedAttentionBotIds,
} from "../attention/attention-storage.ts";
import {
  forgetBotMessages,
  MESSAGES_KEY_PREFIX,
  storedMessageBotIds,
} from "../chat/use-bot-messages.ts";
import {
  deleteBotMemory,
  memoryKey,
  storedMemoryBotIds,
} from "../memory/memory-storage.ts";
import {
  clearBotUsage,
  saveUsage,
  storedUsageBotIds,
} from "../usage/usage-storage.ts";
import {
  forgetBotData,
  pruneOrphanBotData,
  type BotDataStore,
} from "./bot-data-cleanup.ts";

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

describe("per-domain forget functions", () => {
  it("forgets one bot's messages and lists the others", () => {
    const s = fakeStorage({
      [`${MESSAGES_KEY_PREFIX}a`]: "[]",
      [`${MESSAGES_KEY_PREFIX}b`]: "[]",
      unrelated: "x",
    });
    forgetBotMessages("a", s);
    assert.deepEqual(storedMessageBotIds(s), ["b"]);
    assert.equal(s.map.has("unrelated"), true);
  });
  it("forgets one bot's memory and lists the others", () => {
    const s = fakeStorage({ [memoryKey("a")]: "[]", [memoryKey("b")]: "[]" });
    assert.deepEqual(storedMemoryBotIds(s).sort(), ["a", "b"]);
    deleteBotMemory("a", s);
    assert.deepEqual(storedMemoryBotIds(s), ["b"]);
  });
  it("forgets one bot's usage and lists the others", () => {
    const s = fakeStorage();
    const record = (botId: string) => ({
      day: "2026-11-01",
      botId,
      calls: 1,
      promptTokens: 1,
      completionTokens: 1,
    });
    saveUsage([record("a"), record("b")] as never, s);
    assert.deepEqual(storedUsageBotIds(s).sort(), ["a", "b"]);
    clearBotUsage("a", s);
    assert.deepEqual(storedUsageBotIds(s), ["b"]);
  });
  it("forgets one bot's attention count and lists the others", () => {
    const s = fakeStorage();
    saveAttention({ a: 2, b: 1 }, s);
    assert.deepEqual(storedAttentionBotIds(s).sort(), ["a", "b"]);
    forgetBotAttention("a", s);
    assert.deepEqual(storedAttentionBotIds(s), ["b"]);
    forgetBotAttention("missing", s);
    forgetBotAttention("b", s);
    assert.equal(s.map.size, 0);
  });
});

function recordingStore(ids: string[]): BotDataStore & { forgotten: string[] } {
  const forgotten: string[] = [];
  return {
    forgotten,
    botIds: () => ids,
    forget: (id) => void forgotten.push(id),
  };
}

describe("forgetBotData", () => {
  it("asks every domain, even when one throws", () => {
    const calls: string[] = [];
    const broken: BotDataStore = {
      botIds: () => [],
      forget: () => {
        throw new Error("blocked");
      },
    };
    const ok: BotDataStore = {
      botIds: () => [],
      forget: (id) => void calls.push(id),
    };
    forgetBotData("x", [broken, ok]);
    assert.deepEqual(calls, ["x"]);
  });
});

describe("pruneOrphanBotData", () => {
  it("does nothing when the bot list is not trusted (null or empty)", () => {
    const store = recordingStore(["ghost"]);
    assert.deepEqual(pruneOrphanBotData(null, [store]), []);
    assert.deepEqual(pruneOrphanBotData(new Set(), [store]), []);
    assert.deepEqual(store.forgotten, []);
  });
  it("does nothing when storage has no valid bot list yet", () => {
    // Not loaded / failed to load: protectedBotIdsFromStorage is null.
    const store = recordingStore(["ghost"]);
    assert.deepEqual(pruneOrphanBotData(undefined, [store]), []);
    assert.deepEqual(store.forgotten, []);
  });
  it("forgets only ids that are not protected", () => {
    const store = recordingStore(["keep", "ghost", "chief-of-staff"]);
    const pruned = pruneOrphanBotData(new Set(["keep", "chief-of-staff"]), [
      store,
    ]);
    assert.deepEqual(pruned, ["ghost"]);
    assert.deepEqual(store.forgotten, ["ghost"]);
  });
  it("keeps going when one domain fails", () => {
    const broken: BotDataStore = {
      botIds: () => {
        throw new Error("blocked");
      },
      forget: () => {},
    };
    const store = recordingStore(["ghost"]);
    assert.deepEqual(pruneOrphanBotData(new Set(["a"]), [broken, store]), [
      "ghost",
    ]);
  });
});
