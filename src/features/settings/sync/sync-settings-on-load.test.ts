import assert from "node:assert/strict";
import test from "node:test";
import type { AppSettings, SettingKey } from "../settings-types.ts";
import { syncSettingsOnLoad, type LoadDeps } from "./sync-settings-on-load.ts";
import type { SettingsApi, SettingsResult } from "./settings-sync-types.ts";

function setup(options: {
  server: SettingsResult;
  local?: AppSettings;
  unsynced?: SettingKey[];
  putOk?: boolean;
  onGet?: (local: AppSettings) => void;
}) {
  const local: Record<string, unknown> = { ...options.local };
  const unsynced = new Set<SettingKey>(options.unsynced);
  const puts: unknown[] = [];
  const mirrored: [string, unknown][] = [];
  const failures: unknown[] = [];
  const api: SettingsApi = {
    async get() {
      options.onGet?.(local as AppSettings);
      return options.server;
    },
    async put(patch) {
      puts.push(patch);
      return options.putOk === false
        ? { ok: false, failure: { kind: "http", status: 400 } }
        : { ok: true };
    },
  };
  const deps: LoadDeps = {
    api,
    readLocal: (key) => local[key] as AppSettings[SettingKey],
    isUnsynced: (key) => unsynced.has(key),
    setUnsynced: (key, value) =>
      void (value ? unsynced.add(key) : unsynced.delete(key)),
    mirror: (key, value) => {
      mirrored.push([key, value]);
      local[key] = value;
    },
    reportFailure: (failure) => void failures.push(failure),
  };
  return { deps, local, unsynced, puts, mirrored, failures };
}

test("server values are mirrored into the browser, nothing is sent", async () => {
  const s = setup({
    server: { ok: true, settings: { language: "en", memoryEnabled: false } },
    local: { language: "pt" },
  });
  await syncSettingsOnLoad(s.deps);
  assert.deepEqual(s.mirrored, [
    ["language", "en"],
    ["memoryEnabled", false],
  ]);
  assert.deepEqual(s.puts, []);
});

test("settings the server lacks are imported in one request", async () => {
  const model = { provider: "local", baseUrl: "http://a", model: "m" };
  const s = setup({
    server: { ok: true, settings: {} },
    local: { language: "es", modelConfig: model as AppSettings["modelConfig"] },
  });
  await syncSettingsOnLoad(s.deps);
  assert.deepEqual(s.puts, [{ language: "es", modelConfig: model }]);
  assert.equal(s.unsynced.size, 0);
});

test("a refused import is reported and stays unsynced", async () => {
  const s = setup({
    server: { ok: true, settings: {} },
    local: { language: "es" },
    putOk: false,
  });
  await syncSettingsOnLoad(s.deps);
  assert.equal(s.failures.length, 1);
  assert.deepEqual([...s.unsynced], ["language"]);
});

test("an unreachable server marks the browser's values unsynced", async () => {
  const s = setup({
    server: { ok: false, failure: { kind: "network" } },
    local: { language: "en" },
  });
  await syncSettingsOnLoad(s.deps);
  assert.deepEqual([...s.unsynced], ["language"]);
  assert.deepEqual(s.puts, []);
  assert.deepEqual(s.mirrored, []);
});

test("an undelivered clear is sent as null", async () => {
  const s = setup({
    server: {
      ok: true,
      settings: { modelConfig: { provider: "anthropic", model: "m" } },
    },
    unsynced: ["modelConfig"],
  });
  await syncSettingsOnLoad(s.deps);
  assert.deepEqual(s.puts, [{ modelConfig: null }]);
  assert.equal(s.unsynced.size, 0);
});

test("a value saved while the request was out is not overwritten", async () => {
  const s = setup({
    server: { ok: true, settings: { language: "en" } },
    local: { language: "pt" },
    onGet: (local) => {
      local.language = "es";
    },
  });
  await syncSettingsOnLoad(s.deps);
  assert.deepEqual(s.mirrored, []);
  assert.equal(s.local.language, "es");
});
