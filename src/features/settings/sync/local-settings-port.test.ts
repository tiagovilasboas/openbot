import assert from "node:assert/strict";
import test from "node:test";
import {
  isSettingUnsynced,
  setSettingUnsynced,
  SETTINGS_UNSYNCED_KEY,
} from "./local-settings-port.ts";
import { settingsSyncErrorCode } from "./settings-sync-failure.ts";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as Storage;
}

test("keys are flagged and cleared one by one", () => {
  const storage = memoryStorage();
  setSettingUnsynced(storage, "language", true);
  setSettingUnsynced(storage, "modelConfig", true);
  assert.equal(isSettingUnsynced(storage, "language"), true);
  setSettingUnsynced(storage, "language", false);
  assert.equal(isSettingUnsynced(storage, "language"), false);
  assert.equal(isSettingUnsynced(storage, "modelConfig"), true);
  setSettingUnsynced(storage, "modelConfig", false);
  assert.equal(storage.getItem(SETTINGS_UNSYNCED_KEY), null);
});

test("a damaged flag list reads as nothing unsynced", () => {
  const storage = memoryStorage();
  storage.setItem(SETTINGS_UNSYNCED_KEY, "{not json");
  assert.equal(isSettingUnsynced(storage, "language"), false);
  storage.setItem(SETTINGS_UNSYNCED_KEY, JSON.stringify(["other", "language"]));
  assert.equal(isSettingUnsynced(storage, "language"), true);
});

test("the flag key shares no prefix with another openbot key", () => {
  for (const other of [
    "openbot_bots",
    "openbot_msgs_",
    "openbot_memory_",
    "openbot_conversations_unsynced",
    "openbot_language",
    "openbot_model_config",
    "openbot_use_memory",
  ]) {
    assert.ok(!SETTINGS_UNSYNCED_KEY.startsWith(other));
    assert.ok(!other.startsWith(SETTINGS_UNSYNCED_KEY));
  }
});

test("only a refusal is worth showing", () => {
  assert.equal(settingsSyncErrorCode({ kind: "network" }), null);
  assert.equal(settingsSyncErrorCode({ kind: "http", status: 503 }), null);
  assert.equal(
    settingsSyncErrorCode({ kind: "http", status: 401 }),
    "unauthorized",
  );
  assert.equal(
    settingsSyncErrorCode({ kind: "http", status: 413 }),
    "rejected",
  );
  assert.equal(
    settingsSyncErrorCode({
      kind: "http",
      status: 400,
      error: "invalid_setting",
    }),
    "rejected",
  );
});
