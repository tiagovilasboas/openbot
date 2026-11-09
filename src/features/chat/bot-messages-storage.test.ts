import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import type { MessageData } from "./ChatMessageItem.tsx";
import {
  loadBotMessages,
  saveBotMessages,
  subscribeBotMessages,
} from "./use-bot-messages.ts";

const win = globalThis as { window?: unknown };

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
  return { store, storage };
}

const msg = (id: number, text = `m${id}`): MessageData => ({
  id,
  language: "en",
  role: id % 2 ? "user" : "assistant",
  text,
});

// The module caches per bot id, so every test uses its own id.
let counter = 0;
let botId = "";
beforeEach(() => {
  botId = `bot-${++counter}`;
});
afterEach(() => {
  delete win.window;
});

test("without a window the loader and saver are inert", () => {
  assert.deepEqual(loadBotMessages(botId), []);
  assert.doesNotThrow(() => saveBotMessages(botId, [msg(1)]));
});

test("an empty storage yields one stable empty array", () => {
  win.window = { localStorage: fakeStorage().storage };
  const first = loadBotMessages(botId);
  assert.deepEqual(first, []);
  assert.equal(loadBotMessages(botId), first);
});

test("saved messages are stored under a per-bot key and read back", () => {
  const { storage, store } = fakeStorage();
  win.window = { localStorage: storage };
  const messages = [msg(1), msg(2)];
  saveBotMessages(botId, messages);
  assert.equal(store.get(`openbot_msgs_${botId}`), JSON.stringify(messages));
  assert.deepEqual(loadBotMessages(botId), messages);
});

test("unchanged storage returns the same reference, as useSyncExternalStore needs", () => {
  win.window = { localStorage: fakeStorage().storage };
  saveBotMessages(botId, [msg(1)]);
  assert.equal(loadBotMessages(botId), loadBotMessages(botId));
});

test("a change made behind the cache's back is picked up", () => {
  const { storage } = fakeStorage();
  win.window = { localStorage: storage };
  saveBotMessages(botId, [msg(1)]);
  storage.setItem(
    `openbot_msgs_${botId}`,
    JSON.stringify([msg(7, "other tab")]),
  );
  assert.equal(loadBotMessages(botId)[0]?.text, "other tab");
});

test("removing the stored thread after it had messages empties the load", () => {
  const { storage } = fakeStorage();
  win.window = { localStorage: storage };
  saveBotMessages(botId, [msg(1)]);
  storage.removeItem(`openbot_msgs_${botId}`);
  assert.deepEqual(loadBotMessages(botId), []);
});

test("corrupt JSON and non-array JSON load as empty without throwing", () => {
  for (const raw of ["{broken", "null", "42", '{"a":1}', '"text"']) {
    const id = `${botId}-${raw.length}-${raw.charCodeAt(0)}`;
    win.window = {
      localStorage: fakeStorage({ [`openbot_msgs_${id}`]: raw }).storage,
    };
    assert.deepEqual(loadBotMessages(id), [], raw);
  }
});

test("a storage that throws on read loads as empty", () => {
  win.window = {
    localStorage: {
      getItem: () => {
        throw new Error("blocked");
      },
    },
  };
  assert.deepEqual(loadBotMessages(botId), []);
});

test("a storage that throws on write (quota) does not throw or notify", () => {
  win.window = {
    localStorage: {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    },
  };
  let notified = 0;
  const off = subscribeBotMessages(botId, () => notified++);
  assert.doesNotThrow(() => saveBotMessages(botId, [msg(1)]));
  assert.equal(notified, 0);
  off();
});

test("saving notifies only the listeners of that bot", () => {
  win.window = { localStorage: fakeStorage().storage };
  const other = `${botId}-other`;
  let mine = 0;
  let theirs = 0;
  const offMine = subscribeBotMessages(botId, () => mine++);
  const offTheirs = subscribeBotMessages(other, () => theirs++);
  saveBotMessages(botId, [msg(1)]);
  assert.deepEqual([mine, theirs], [1, 0]);
  offMine();
  offTheirs();
});

test("several listeners are all notified and unsubscribing stops only that one", () => {
  win.window = { localStorage: fakeStorage().storage };
  let a = 0;
  let b = 0;
  const offA = subscribeBotMessages(botId, () => a++);
  const offB = subscribeBotMessages(botId, () => b++);
  saveBotMessages(botId, [msg(1)]);
  offA();
  saveBotMessages(botId, [msg(1), msg(2)]);
  assert.deepEqual([a, b], [1, 2]);
  offB();
  assert.doesNotThrow(() => saveBotMessages(botId, []));
});

test("unsubscribing twice is harmless", () => {
  const off = subscribeBotMessages(botId, () => {});
  off();
  assert.doesNotThrow(off);
});

test("clearing a thread stores an empty array and notifies", () => {
  const { storage, store } = fakeStorage();
  win.window = { localStorage: storage };
  saveBotMessages(botId, [msg(1)]);
  let notified = 0;
  const off = subscribeBotMessages(botId, () => notified++);
  saveBotMessages(botId, []);
  assert.equal(store.get(`openbot_msgs_${botId}`), "[]");
  assert.deepEqual(loadBotMessages(botId), []);
  assert.equal(notified, 1);
  off();
});

test("threads of different bots do not leak into each other", () => {
  win.window = { localStorage: fakeStorage().storage };
  saveBotMessages(botId, [msg(1, "mine")]);
  saveBotMessages(`${botId}-b`, [msg(1, "theirs")]);
  assert.equal(loadBotMessages(botId)[0]?.text, "mine");
  assert.equal(loadBotMessages(`${botId}-b`)[0]?.text, "theirs");
});
