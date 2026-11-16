import assert from "node:assert/strict";
import test from "node:test";
import {
  UNDO_WINDOW_MS,
  isDeletionDue,
  scheduleDeletion,
  undoTimeLeft,
  withoutPendingDeletion,
} from "./bot-deletion.ts";
import { loadBotsFromStorage, saveBotsToStorage } from "./bot-storage.ts";
import { CREW_PRESETS } from "./crew-presets.ts";

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  } as Storage;
}

test("a scheduled deletion commits after the 8 second undo window", () => {
  const { pending, commitNow } = scheduleDeletion(null, "a", 1_000);
  assert.equal(UNDO_WINDOW_MS, 8_000);
  assert.equal(commitNow, null);
  assert.equal(undoTimeLeft(pending, 1_000), 8_000);
  assert.equal(isDeletionDue(pending, 8_999), false);
  assert.equal(isDeletionDue(pending, 9_000), true);
  assert.equal(undoTimeLeft(pending, 20_000), 0);
});

test("starting a second deletion commits the first one right away", () => {
  const first = scheduleDeletion(null, "a", 0).pending;
  const second = scheduleDeletion(first, "b", 500);
  assert.equal(second.commitNow, "a");
  assert.equal(second.pending.botId, "b");
  assert.equal(scheduleDeletion(first, "a", 500).commitNow, null);
});

test("the pending bot leaves the visible list, not the stored one", () => {
  const list = [...CREW_PRESETS];
  const target = list[1]!;
  const { pending } = scheduleDeletion(null, target.id, 0);
  const shown = withoutPendingDeletion(list, pending);
  assert.equal(shown.length, list.length - 1);
  assert.equal(
    shown.some((b) => b.id === target.id),
    false,
  );
  assert.equal(withoutPendingDeletion(list, null).length, list.length);
});

test("closing the tab mid-window reverts: storage still holds the bot", () => {
  const storage = memoryStorage();
  saveBotsToStorage([...CREW_PRESETS], storage);
  // Scheduling touches no storage; a reload sees the full list again.
  scheduleDeletion(null, CREW_PRESETS[1]!.id, 0);
  const reloaded = loadBotsFromStorage(storage);
  assert.equal(reloaded.length, CREW_PRESETS.length);
});
