import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_THREAD_ID,
  THREADS_KEY_PREFIX,
  botIdOfStorageId,
  messageStorageId,
  newThread,
  removeThread,
  renameThread,
  resolveThreadId,
  storableThreads,
  withDefaultThread,
} from "./thread-model.ts";
import { loadThreads, saveThreads } from "./thread-storage.ts";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

test("a bot with nothing stored has just the default thread", () => {
  const threads = withDefaultThread("bot-a", null);
  assert.deepEqual(
    threads.map((t) => t.id),
    [DEFAULT_THREAD_ID],
  );
  assert.equal(threads[0].botId, "bot-a");
});

test("the default thread keeps the existing message key", () => {
  assert.equal(messageStorageId("bot-a", DEFAULT_THREAD_ID), "bot-a");
  assert.equal(messageStorageId("bot-a", "t1"), "bot-a~t1");
  assert.equal(botIdOfStorageId("bot-a~t1"), "bot-a");
  assert.equal(botIdOfStorageId("bot-a"), "bot-a");
});

test("stored threads come after the default, oldest first, and junk is dropped", () => {
  const threads = withDefaultThread("bot-a", [
    { id: "t2", title: "Two", createdAt: 20, updatedAt: 20 },
    { id: "t1", title: "One", createdAt: 10, updatedAt: 10 },
    { id: "t1", title: "Duplicate", createdAt: 1, updatedAt: 1 },
    { id: DEFAULT_THREAD_ID, title: "Hijack" },
    { id: "bad id!" },
    "nope",
    null,
  ]);
  assert.deepEqual(
    threads.map((t) => t.id),
    [DEFAULT_THREAD_ID, "t1", "t2"],
  );
  assert.equal(threads[0].title, null);
});

test("an unreadable list migrates to the default thread alone", () => {
  assert.equal(withDefaultThread("bot-a", "{broken").length, 1);
  assert.equal(withDefaultThread("bot-a", { id: "t1" }).length, 1);
});

test("a branch records its parent and the message it came from", () => {
  const t = newThread("bot-a", "t1", 5, {
    title: "  Plan (branch) ",
    parentThreadId: DEFAULT_THREAD_ID,
    branchedFromMessageId: 4,
  });
  assert.equal(t.title, "Plan (branch)");
  assert.equal(t.parentThreadId, DEFAULT_THREAD_ID);
  assert.equal(t.branchedFromMessageId, 4);
  assert.equal(newThread("bot-a", "t2", 5).parentThreadId, undefined);
});

test("rename and remove never touch the default thread", () => {
  const threads = [
    ...withDefaultThread("bot-a", null),
    newThread("bot-a", "t1", 1),
  ];
  const renamed = renameThread(threads, "t1", " Notes ", 9);
  assert.equal(renamed[1].title, "Notes");
  assert.equal(renamed[1].updatedAt, 9);
  assert.equal(renameThread(threads, DEFAULT_THREAD_ID, "x", 9)[0].title, null);
  assert.equal(renameThread(threads, "t1", "  ", 9)[1].title, null);
  assert.equal(removeThread(threads, "t1").length, 1);
  assert.equal(removeThread(threads, DEFAULT_THREAD_ID).length, 2);
});

test("a vanished thread resolves to the default", () => {
  const threads = withDefaultThread("bot-a", [
    { id: "t1", createdAt: 1, updatedAt: 1 },
  ]);
  assert.equal(resolveThreadId(threads, "t1"), "t1");
  assert.equal(resolveThreadId(threads, "gone"), DEFAULT_THREAD_ID);
});

test("storage keeps extras only, and an empty list clears the key", () => {
  const storage = fakeStorage();
  const extra = newThread("bot-s", "t1", 1, { title: "A" });
  const all = [...withDefaultThread("bot-s", null), extra];
  assert.deepEqual(storableThreads(all), [extra]);
  saveThreads("bot-s", all, storage);
  assert.ok(storage.store.has(THREADS_KEY_PREFIX + "bot-s"));
  assert.deepEqual(
    loadThreads("bot-s", storage).map((t) => t.id),
    [DEFAULT_THREAD_ID, "t1"],
  );
  saveThreads("bot-s", withDefaultThread("bot-s", null), storage);
  assert.equal(storage.store.size, 0);
});

test("loading twice with unchanged storage returns the same array", () => {
  const storage = fakeStorage();
  assert.equal(loadThreads("bot-c", storage), loadThreads("bot-c", storage));
});
