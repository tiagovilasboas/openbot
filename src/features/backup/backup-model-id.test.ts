import assert from "node:assert/strict";
import test from "node:test";
import { loadBotsFromStorage } from "../bots/bot-storage.ts";
import { buildBackup } from "./build-backup.ts";
import { parseBackup } from "./parse-backup.ts";
import { restoreBackup } from "./restore-backup.ts";
import type { BackupStorage } from "./backup-types.ts";

class FakeStorage implements BackupStorage {
  readonly map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const bot = (id: string, extra: object = {}) => ({
  id,
  name: id,
  description: "d",
  avatarShape: "hexagon",
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

function seeded(): FakeStorage {
  const storage = new FakeStorage();
  storage.setItem(
    "openbot_bots",
    JSON.stringify([bot("a", { modelId: "vendor/own:free" }), bot("b")]),
  );
  storage.setItem("openbot_active_bot_id", "a");
  return storage;
}

test("a bot's modelId round-trips through backup, parse and restore", () => {
  const backup = buildBackup(seeded(), "en");
  const parsed = parseBackup(JSON.stringify(backup));
  assert.ok(parsed.ok);
  const [a, b] = parsed.backup.data.bots;
  assert.equal(a?.modelId, "vendor/own:free");
  assert.equal(b?.modelId, undefined);

  const target = new FakeStorage();
  restoreBackup(parsed.backup, target, "replace");
  const restored = parseBackup(JSON.stringify(buildBackup(target, "en")));
  assert.ok(restored.ok);
  assert.equal(restored.backup.data.bots[0]?.modelId, "vendor/own:free");
});

test("merging a backup keeps the modelId of the bots it adds", () => {
  const parsed = parseBackup(JSON.stringify(buildBackup(seeded(), "en")));
  assert.ok(parsed.ok);
  const target = new FakeStorage();
  target.setItem("openbot_bots", JSON.stringify([bot("z")]));
  restoreBackup(parsed.backup, target, "merge");
  const merged = loadBotsFromStorage(target as unknown as Storage);
  assert.equal(merged.find((b) => b.id === "a")?.modelId, "vendor/own:free");
  assert.equal(merged.find((b) => b.id === "z")?.modelId, undefined);
});

test("a malformed modelId in a backup file is dropped, not restored", () => {
  const file = JSON.stringify({
    app: "openbot",
    version: 1,
    exportedAt: "2026-01-01T00:00:00.000Z",
    data: {
      bots: [bot("a", { modelId: "x; rm -rf /" }), bot("b", { modelId: 3 })],
      messages: {},
    },
  });
  const parsed = parseBackup(file);
  assert.ok(parsed.ok);
  for (const restoredBot of parsed.backup.data.bots) {
    assert.ok(!("modelId" in restoredBot));
  }
});
