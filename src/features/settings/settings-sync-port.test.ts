import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  loadStoredLanguage,
  saveLanguage,
} from "../chat/language-preference.ts";
import {
  loadStoredMemoryEnabled,
  saveMemoryEnabled,
} from "../memory/memory-setting.ts";
import {
  connectSettingsSync,
  notifySettingsChanged,
} from "./settings-sync-port.ts";
import type { SettingsPatch } from "./settings-types.ts";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as Storage;
}

function connect(): SettingsPatch[] {
  const patches: SettingsPatch[] = [];
  connectSettingsSync({ changed: (patch) => void patches.push(patch) });
  return patches;
}

afterEach(() => connectSettingsSync(null));

test("notifying with nothing connected does nothing", () => {
  assert.doesNotThrow(() => notifySettingsChanged({ language: "en" }));
});

test("saving the language tells the server; a mirror does not", () => {
  const patches = connect();
  const storage = memoryStorage();
  saveLanguage("en", storage);
  saveLanguage("es", storage, { sync: false });
  assert.deepEqual(patches, [{ language: "en" }]);
  assert.equal(loadStoredLanguage(storage), "es");
});

test("the stored language is undefined until the user chose one", () => {
  assert.equal(loadStoredLanguage(memoryStorage()), undefined);
});

test("switching memory off or on tells the server with the value", () => {
  const patches = connect();
  const storage = memoryStorage();
  saveMemoryEnabled(false, storage);
  assert.equal(loadStoredMemoryEnabled(storage), false);
  saveMemoryEnabled(true, storage);
  assert.equal(loadStoredMemoryEnabled(storage), undefined);
  saveMemoryEnabled(false, storage, { sync: false });
  assert.deepEqual(patches, [
    { memoryEnabled: false },
    { memoryEnabled: true },
  ]);
});
