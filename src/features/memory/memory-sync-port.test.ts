import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import type { MemoryEntry } from "./memory-entries.ts";
import {
  deleteBotMemory,
  loadMemoryEntries,
  saveMemoryEntries,
  type MemoryStorage,
} from "./memory-storage.ts";
import { connectMemorySync } from "./memory-sync-port.ts";

function fakeStorage(): MemoryStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  };
}

const note = (n: number): MemoryEntry => ({
  id: `mem_${n}`,
  text: `note ${n}`,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const calls: string[] = [];
beforeEach(() => {
  calls.length = 0;
  connectMemorySync({
    saved: (botId, entries) => calls.push(`saved:${botId}:${entries.length}`),
    forgotten: (botId) => calls.push(`forgotten:${botId}`),
  });
});
afterEach(() => connectMemorySync(null));

test("a save reaches the port with the notes", () => {
  const storage = fakeStorage();
  saveMemoryEntries("a", [note(1), note(2)], storage);
  assert.deepEqual(calls, ["saved:a:2"]);
});

test("clearing the notes is a save of an empty list", () => {
  saveMemoryEntries("a", [], fakeStorage());
  assert.deepEqual(calls, ["saved:a:0"]);
});

test("a mirrored save stays local", () => {
  const storage = fakeStorage();
  saveMemoryEntries("a", [note(1)], storage, { sync: false });
  assert.deepEqual(calls, []);
  assert.deepEqual(loadMemoryEntries("a", storage), [note(1)]);
});

test("deleting a bot's notes tells the port to forget them, not to save", () => {
  const storage = fakeStorage();
  saveMemoryEntries("a", [note(1)], storage, { sync: false });
  deleteBotMemory("a", storage);
  assert.deepEqual(calls, ["forgotten:a"]);
  assert.deepEqual(loadMemoryEntries("a", storage), []);
});

test("blocked storage still queues the save for the server", () => {
  const blocked: MemoryStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(saveMemoryEntries("a", [note(1)], blocked), false);
  assert.deepEqual(calls, ["saved:a:1"]);
});

test("without a connected port saving works as before", () => {
  connectMemorySync(null);
  assert.equal(saveMemoryEntries("a", [note(1)], fakeStorage()), true);
  assert.deepEqual(calls, []);
});
