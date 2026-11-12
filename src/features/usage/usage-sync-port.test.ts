import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { forgetBotData } from "../bots/bot-data-cleanup.ts";
import type { UsageRecord } from "./usage-record.ts";
import {
  clearAllUsage,
  clearBotUsage,
  loadUsage,
  saveUsage,
  USAGE_STORAGE_KEY,
  type UsageStorage,
} from "./usage-storage.ts";
import { connectUsageSync } from "./usage-sync-port.ts";

class FakeStorage implements UsageStorage {
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

const rec = (botId: string, day = "2026-01-02"): UsageRecord => ({
  botId,
  day,
  inputTokens: 10,
  outputTokens: 5,
  calls: 1,
  callsWithoutUsage: 0,
});

function connected() {
  const saves: (readonly UsageRecord[])[] = [];
  connectUsageSync({ saved: (records) => saves.push(records) });
  return saves;
}

afterEach(() => {
  connectUsageSync(null);
  delete (globalThis as { window?: unknown }).window;
});

test("a save reaches the port with the saved list", () => {
  const saves = connected();
  saveUsage([rec("a")], new FakeStorage());
  assert.deepEqual(saves, [[rec("a")]]);
});

test("mirroring the server with sync false does not go back", () => {
  const saves = connected();
  const storage = new FakeStorage();
  saveUsage([rec("a")], storage, { sync: false });
  assert.equal(saves.length, 0);
  assert.equal(loadUsage(storage).length, 1);
});

test("a blocked save is not announced", () => {
  const saves = connected();
  saveUsage([rec("a")], undefined);
  assert.equal(saves.length, 0);
});

test("clearing one bot sends the rest; clearing all sends an empty list", () => {
  const saves = connected();
  const storage = new FakeStorage();
  storage.setItem(USAGE_STORAGE_KEY, JSON.stringify([rec("a"), rec("b")]));
  clearBotUsage("a", storage);
  assert.deepEqual(saves.at(-1), [rec("b")]);
  clearAllUsage(storage);
  assert.deepEqual(saves.at(-1), []);
});

test("deleting a bot clears its usage through the port", () => {
  const storage = new FakeStorage();
  storage.setItem(USAGE_STORAGE_KEY, JSON.stringify([rec("a"), rec("b")]));
  (globalThis as { window?: unknown }).window = {
    localStorage: storage,
    addEventListener() {},
    removeEventListener() {},
  };
  const saves = connected();
  forgetBotData("a");
  assert.deepEqual(saves.at(-1), [rec("b")]);
});
