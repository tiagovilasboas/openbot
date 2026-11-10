import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { recordUsageCall, USAGE_STORAGE_KEY } from "../usage/usage-storage.ts";
import type { BackupStorage } from "./backup-types.ts";
import { buildBackup } from "./build-backup.ts";
import { parseBackup } from "./parse-backup.ts";
import { restoreBackup } from "./restore-backup.ts";

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

const bot: BotProfile = {
  id: "a",
  name: "a",
  description: "d",
  avatarShape: "hexagon",
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("usage and the backup", () => {
  it("the exported file does not contain the usage log", () => {
    const s = new FakeStorage();
    s.setItem("openbot_bots", JSON.stringify([bot]));
    recordUsageCall(
      "a",
      { inputTokens: 123456, outputTokens: 654321 },
      new Date(),
      s,
    );
    assert.ok(s.map.has(USAGE_STORAGE_KEY));

    const file = JSON.stringify(buildBackup(s));
    assert.equal(file.includes("123456"), false);
    assert.equal(file.includes("654321"), false);
    assert.equal(file.includes("usage"), false);
    assert.equal(file.includes(USAGE_STORAGE_KEY), false);
  });

  it("restoring a backup leaves the local usage log alone", () => {
    const s = new FakeStorage();
    s.setItem("openbot_bots", JSON.stringify([bot]));
    recordUsageCall("a", { inputTokens: 5 }, new Date(2026, 2, 1), s);
    const before = s.getItem(USAGE_STORAGE_KEY);

    const parsed = parseBackup(JSON.stringify(buildBackup(s)));
    assert.ok(parsed.ok);
    restoreBackup(parsed.backup, s, "replace");
    assert.equal(s.getItem(USAGE_STORAGE_KEY), before);
  });
});
