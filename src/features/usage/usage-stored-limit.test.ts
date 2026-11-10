import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeUsage } from "./sanitize-usage.ts";
import {
  loadUsage,
  USAGE_MAX_STORED_LENGTH,
  USAGE_STORAGE_KEY,
  type UsageStorage,
} from "./usage-storage.ts";

const record = (botId: string) => ({
  botId,
  day: "2026-03-01",
  inputTokens: 1,
  outputTokens: 1,
  calls: 1,
  callsWithoutUsage: 0,
});

function storageWith(raw: string): UsageStorage {
  return {
    getItem: (key) => (key === USAGE_STORAGE_KEY ? raw : null),
    setItem: () => undefined,
    removeItem: () => undefined,
  };
}

test("a stored usage text over the ceiling is ignored, not parsed", () => {
  const padded = JSON.stringify([
    record("a"),
    ...Array.from({ length: 30_000 }, () => ({ padding: "x".repeat(60) })),
  ]);
  assert.ok(padded.length > USAGE_MAX_STORED_LENGTH);
  assert.deepEqual(loadUsage(storageWith(padded)), []);
});

test("a stored usage under the ceiling still loads", () => {
  assert.equal(loadUsage(storageWith(JSON.stringify([record("a")]))).length, 1);
});

test("usage records follow the bot id rule", () => {
  const ok = ["a", "chief-of-staff", "bot_1730000000000_ab12c"];
  const bad = ["x".repeat(65), "has space", "a/b", "__proto__", "constructor"];
  const kept = sanitizeUsage([...ok, ...bad].map(record)).map((r) => r.botId);
  assert.deepEqual(kept.sort(), [...ok].sort());
});
