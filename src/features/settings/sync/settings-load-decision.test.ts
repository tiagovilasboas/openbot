import assert from "node:assert/strict";
import test from "node:test";
import { decideSettingLoad } from "./settings-load-decision.ts";
import type { SettingsResult } from "./settings-sync-types.ts";

const server = (settings: object = {}): SettingsResult => ({
  ok: true,
  settings,
});
const down: SettingsResult = { ok: false, failure: { kind: "network" } };

test("the server wins when it has the setting", () => {
  assert.deepEqual(
    decideSettingLoad({
      server: server({ language: "en" }),
      key: "language",
      local: "pt",
      unsynced: false,
    }),
    { action: "use-server", value: "en" },
  );
  assert.deepEqual(
    decideSettingLoad({
      server: server({ language: "en" }),
      key: "language",
      local: undefined,
      unsynced: false,
    }),
    { action: "use-server", value: "en" },
  );
});

test("an equal value keeps the browser as it is", () => {
  const modelConfig = {
    provider: "local" as const,
    baseUrl: "http://a",
    model: "m",
  };
  assert.deepEqual(
    decideSettingLoad({
      server: server({ modelConfig }),
      key: "modelConfig",
      local: { ...modelConfig },
      unsynced: false,
    }),
    { action: "keep-local" },
  );
});

test("a server without the setting takes the browser's value", () => {
  assert.deepEqual(
    decideSettingLoad({
      server: server(),
      key: "memoryEnabled",
      local: false,
      unsynced: false,
    }),
    { action: "import", value: false },
  );
  assert.deepEqual(
    decideSettingLoad({
      server: server(),
      key: "memoryEnabled",
      local: undefined,
      unsynced: false,
    }),
    { action: "keep-local" },
  );
});

test("an undelivered change wins, an undelivered clear imports null", () => {
  assert.deepEqual(
    decideSettingLoad({
      server: server({ language: "en" }),
      key: "language",
      local: "es",
      unsynced: true,
    }),
    { action: "import", value: "es" },
  );
  assert.deepEqual(
    decideSettingLoad({
      server: server({ modelConfig: { provider: "anthropic", model: "m" } }),
      key: "modelConfig",
      local: undefined,
      unsynced: true,
    }),
    { action: "import", value: null },
  );
});

test("an unreachable server keeps the browser's value", () => {
  assert.deepEqual(
    decideSettingLoad({
      server: down,
      key: "language",
      local: "en",
      unsynced: false,
    }),
    { action: "keep-local" },
  );
});
