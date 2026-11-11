import assert from "node:assert/strict";
import test from "node:test";
import { ACTIVE_BOT_STORAGE_KEY, BOTS_STORAGE_KEY } from "../bot-storage.ts";
import { CREW_PRESETS } from "../crew-presets.ts";
import {
  isUnsynced,
  readLocalPayload,
  readLocalSnapshot,
  setUnsynced,
} from "./local-bots-port.ts";

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(initial));
  return {
    length: 0,
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: () => null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  };
}

const [a, b] = CREW_PRESETS;

test("nothing stored, broken or empty is not a trusted list", () => {
  assert.equal(readLocalSnapshot(fakeStorage()), null);
  assert.equal(
    readLocalSnapshot(fakeStorage({ [BOTS_STORAGE_KEY]: "{not json" })),
    null,
  );
  assert.equal(
    readLocalSnapshot(fakeStorage({ [BOTS_STORAGE_KEY]: "[]" })),
    null,
  );
  assert.equal(readLocalPayload(fakeStorage()), null);
});

test("a stored list becomes a snapshot and a ready payload", () => {
  const storage = fakeStorage({
    [BOTS_STORAGE_KEY]: JSON.stringify([a, b]),
    [ACTIVE_BOT_STORAGE_KEY]: b!.id,
    openbot_main_bot_id: b!.id,
  });
  const snapshot = readLocalSnapshot(storage);
  assert.equal(snapshot?.bots.length, 2);
  assert.equal(snapshot?.activeBotId, b!.id);
  const payload = readLocalPayload(storage);
  assert.equal(payload?.mainBotId, b!.id);
  assert.equal(payload?.activeBotId, b!.id);
});

test("the unsynced flag is set and cleared", () => {
  const storage = fakeStorage();
  assert.equal(isUnsynced(storage), false);
  setUnsynced(storage, true);
  assert.equal(isUnsynced(storage), true);
  setUnsynced(storage, false);
  assert.equal(isUnsynced(storage), false);
});
