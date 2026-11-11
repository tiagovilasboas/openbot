import assert from "node:assert/strict";
import test from "node:test";

import {
  loadAttention,
  saveAttention,
  NO_ATTENTION,
} from "./attention-storage.ts";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  } as unknown as Storage;
  return { store, storage };
}

test("nothing stored reads as no attention", () => {
  const { storage } = fakeStorage();
  assert.equal(loadAttention(storage), NO_ATTENTION);
});

test("saved counts are read back, and the snapshot is stable", () => {
  const { storage } = fakeStorage();
  saveAttention({ dev: 2 }, storage);
  const first = loadAttention(storage);
  assert.deepEqual(first, { dev: 2 });
  assert.equal(loadAttention(storage), first);
});

test("saving no counts removes the entry", () => {
  const { store, storage } = fakeStorage();
  saveAttention({ dev: 1 }, storage);
  saveAttention({}, storage);
  assert.equal(store.size, 0);
  assert.equal(loadAttention(storage), NO_ATTENTION);
});

test("broken or oversized stored text reads as no attention", () => {
  const broken = fakeStorage({ openbot_attention: "{nope" });
  assert.equal(loadAttention(broken.storage), NO_ATTENTION);
  const huge = fakeStorage({
    openbot_attention: `{"a":1}${" ".repeat(60_000)}`,
  });
  assert.equal(loadAttention(huge.storage), NO_ATTENTION);
});

test("stored counts out of range are cleaned on read", () => {
  const { storage } = fakeStorage({
    openbot_attention: JSON.stringify({ dev: 1e9, bad: "x" }),
  });
  assert.deepEqual(loadAttention(storage), { dev: 99 });
});

test("a storage that refuses writes does not throw", () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => undefined,
  } as unknown as Storage;
  assert.doesNotThrow(() => saveAttention({ dev: 1 }, storage));
});
