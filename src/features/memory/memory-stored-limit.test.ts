import assert from "node:assert/strict";
import test from "node:test";
import {
  loadMemoryEntries,
  MEMORY_MAX_STORED_LENGTH,
  memoryKey,
  type MemoryStorage,
} from "./memory-storage.ts";

function storageWith(raw: string): MemoryStorage {
  return {
    getItem: (key) => (key === memoryKey("a") ? raw : null),
    setItem: () => undefined,
    removeItem: () => undefined,
  };
}

test("a stored memory text over the ceiling is ignored, not parsed", () => {
  // Valid JSON that would sanitize to one note, padded past the ceiling.
  const padded = JSON.stringify([
    { id: "m", text: "kept?", createdAt: "2026-01-01T00:00:00.000Z" },
    ...Array.from({ length: 20_000 }, () => ({ id: "x", text: "" })),
  ]);
  assert.ok(padded.length > MEMORY_MAX_STORED_LENGTH);
  assert.deepEqual(loadMemoryEntries("a", storageWith(padded)), []);
});

test("a stored memory under the ceiling still loads", () => {
  const raw = JSON.stringify([
    { id: "m", text: "likes tea", createdAt: "2026-01-01T00:00:00.000Z" },
  ]);
  assert.equal(loadMemoryEntries("a", storageWith(raw)).length, 1);
});

test("a full, legitimate memory fits under the ceiling", () => {
  const notes = Array.from({ length: 30 }, (_, i) => ({
    id: `m${i}`.padEnd(64, "x"),
    text: "é".repeat(130),
    createdAt: "2026-01-01T00:00:00.000Z",
  }));
  assert.ok(JSON.stringify(notes).length < MEMORY_MAX_STORED_LENGTH);
});
