import assert from "node:assert/strict";
import test from "node:test";
import { MEMORY_KEY_PREFIX } from "../memory-storage.ts";
import {
  MEMORY_UNSYNCED_KEY,
  isMemoryUnsynced,
  setMemoryUnsynced,
} from "./local-memory-port.ts";

function fakeStorage(initial?: string) {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(MEMORY_UNSYNCED_KEY, initial);
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  } as unknown as Storage;
  return { store, storage };
}

test("the flag key is not read as a bot's notes by the pruning prefix", () => {
  assert.equal(MEMORY_UNSYNCED_KEY.startsWith(MEMORY_KEY_PREFIX), false);
});

test("bots are marked and cleared one by one", () => {
  const { storage, store } = fakeStorage();
  setMemoryUnsynced(storage, "a", true);
  setMemoryUnsynced(storage, "b", true);
  assert.ok(isMemoryUnsynced(storage, "a"));
  setMemoryUnsynced(storage, "a", false);
  assert.equal(isMemoryUnsynced(storage, "a"), false);
  assert.ok(isMemoryUnsynced(storage, "b"));
  setMemoryUnsynced(storage, "b", false);
  assert.equal(store.has(MEMORY_UNSYNCED_KEY), false);
});

test("a broken stored value reads as nothing unsynced", () => {
  assert.equal(isMemoryUnsynced(fakeStorage("1").storage, "a"), false);
  assert.equal(isMemoryUnsynced(fakeStorage("{").storage, "a"), false);
});
