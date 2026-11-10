import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeUsage } from "./sanitize-usage.ts";
import { lastDays } from "./usage-day.ts";
import {
  totalForBot,
  USAGE_MAX_COUNT,
  USAGE_MAX_DAYS,
} from "./usage-record.ts";
import {
  clearAllUsage,
  clearBotUsage,
  loadUsage,
  recordUsageCall,
  saveUsage,
  subscribeUsage,
  USAGE_STORAGE_KEY,
  type UsageStorage,
} from "./usage-storage.ts";

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

const good = {
  botId: "a",
  day: "2026-03-01",
  inputTokens: 5,
  outputTokens: 6,
  calls: 2,
  callsWithoutUsage: 1,
};

describe("sanitizing what storage returns", () => {
  it("keeps a good record untouched", () => {
    assert.deepEqual(sanitizeUsage([good]), [good]);
  });

  it("returns nothing for anything that is not a list", () => {
    for (const value of [null, undefined, "x", 4, {}, { a: good }]) {
      assert.deepEqual(sanitizeUsage(value), []);
    }
  });

  it("drops hostile or malformed entries", () => {
    const result = sanitizeUsage([
      null,
      "x",
      [],
      { ...good, botId: "__proto__" },
      { ...good, botId: "constructor" },
      { ...good, botId: "" },
      { ...good, botId: 7 },
      { ...good, botId: "x".repeat(101) },
      { ...good, day: "2026-02-30" },
      { ...good, day: "yesterday" },
      { ...good, day: undefined },
      good,
    ]);
    assert.deepEqual(result, [good]);
  });

  it("clamps negative, fractional, huge and non-numeric counters", () => {
    const [record] = sanitizeUsage([
      {
        ...good,
        inputTokens: -5,
        outputTokens: 7.9,
        calls: Number.MAX_SAFE_INTEGER * 1e6,
        callsWithoutUsage: "3",
      },
    ]);
    assert.equal(record?.inputTokens, 0);
    assert.equal(record?.outputTokens, 7);
    assert.equal(record?.calls, USAGE_MAX_COUNT);
    assert.equal(record?.callsWithoutUsage, 0);
  });

  it("never lets replies without data exceed the replies", () => {
    const [record] = sanitizeUsage([
      { ...good, calls: 2, callsWithoutUsage: 50 },
    ]);
    assert.equal(record?.callsWithoutUsage, 2);
  });

  it("merges repeated bot and day entries", () => {
    const result = sanitizeUsage([
      good,
      { ...good, inputTokens: 10, calls: 1, callsWithoutUsage: 0 },
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0]?.inputTokens, 15);
    assert.equal(result[0]?.calls, 3);
  });

  it("caps the days kept per bot to the newest ones", () => {
    const days = lastDays("2026-12-31", 400);
    const result = sanitizeUsage(days.map((day) => ({ ...good, day })));
    assert.equal(result.length, USAGE_MAX_DAYS);
    assert.equal(result[0]?.day, "2026-12-31");
    assert.equal(
      result.at(-1)?.day,
      lastDays("2026-12-31", USAGE_MAX_DAYS).at(-1),
    );
  });

  it("caps how many bots it accepts", () => {
    const flood = Array.from({ length: 500 }, (_, i) => ({
      ...good,
      botId: `bot-${i}`,
    }));
    assert.equal(sanitizeUsage(flood).length, 100);
  });
});

describe("usage storage", () => {
  it("records a call under the key and reads it back", () => {
    const s = new FakeStorage();
    recordUsageCall(
      "a",
      { inputTokens: 3, outputTokens: 4 },
      new Date(2026, 2, 1, 10),
      s,
    );
    assert.ok(s.map.has(USAGE_STORAGE_KEY));
    const total = totalForBot(loadUsage(s), "a");
    assert.equal(total.inputTokens, 3);
    assert.equal(total.calls, 1);
  });

  it("uses the local day of the moment of the call", () => {
    const s = new FakeStorage();
    recordUsageCall("a", undefined, new Date(2026, 2, 1, 23, 59), s);
    recordUsageCall("a", undefined, new Date(2026, 2, 2, 0, 1), s);
    assert.deepEqual(
      loadUsage(s)
        .map((r) => r.day)
        .sort(),
      ["2026-03-01", "2026-03-02"],
    );
  });

  it("survives corrupt JSON and hostile content", () => {
    const s = new FakeStorage();
    s.setItem(USAGE_STORAGE_KEY, "{not json");
    assert.deepEqual(loadUsage(s), []);
    s.setItem(USAGE_STORAGE_KEY, JSON.stringify({ __proto__: { x: 1 } }));
    assert.deepEqual(loadUsage(s), []);
    s.setItem(
      USAGE_STORAGE_KEY,
      JSON.stringify([{ ...good, inputTokens: -1, botId: "__proto__" }, good]),
    );
    assert.deepEqual(loadUsage(s), [good]);
  });

  it("clears one bot, then everything, and notifies", () => {
    const s = new FakeStorage();
    recordUsageCall("a", { inputTokens: 1 }, new Date(2026, 2, 1), s);
    recordUsageCall("b", { inputTokens: 1 }, new Date(2026, 2, 1), s);
    let heard = 0;
    const stop = subscribeUsage(() => (heard += 1));
    clearBotUsage("a", s);
    assert.equal(totalForBot(loadUsage(s), "a").calls, 0);
    assert.equal(totalForBot(loadUsage(s), "b").calls, 1);
    clearAllUsage(s);
    assert.equal(s.map.has(USAGE_STORAGE_KEY), false);
    assert.equal(heard, 2);
    stop();
    saveUsage([], s);
    assert.equal(heard, 2);
  });

  it("does nothing, and does not throw, without storage", () => {
    assert.doesNotThrow(() =>
      recordUsageCall("a", undefined, new Date(), undefined),
    );
    assert.deepEqual(loadUsage(undefined), []);
  });

  it("does not throw when the storage refuses to write", () => {
    const full: UsageStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => undefined,
    };
    assert.doesNotThrow(() =>
      recordUsageCall("a", undefined, new Date(), full),
    );
  });
});
