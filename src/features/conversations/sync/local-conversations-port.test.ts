import assert from "node:assert/strict";
import test from "node:test";
import {
  MESSAGES_UNSYNCED_KEY,
  isMessagesUnsynced,
  setMessagesUnsynced,
} from "./local-conversations-port.ts";

function fakeStorage(initial?: string) {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(MESSAGES_UNSYNCED_KEY, initial);
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  } as unknown as Storage;
  return { store, storage };
}

test("bots are marked and cleared one by one", () => {
  const { storage, store } = fakeStorage();
  setMessagesUnsynced(storage, "a", true);
  setMessagesUnsynced(storage, "b", true);
  assert.ok(isMessagesUnsynced(storage, "a"));
  setMessagesUnsynced(storage, "a", false);
  assert.equal(isMessagesUnsynced(storage, "a"), false);
  assert.ok(isMessagesUnsynced(storage, "b"));
  setMessagesUnsynced(storage, "b", false);
  assert.equal(store.has(MESSAGES_UNSYNCED_KEY), false);
});

test("a broken stored value reads as nothing unsynced", () => {
  assert.equal(isMessagesUnsynced(fakeStorage("1").storage, "a"), false);
  assert.equal(isMessagesUnsynced(fakeStorage("{").storage, "a"), false);
});
