import assert from "node:assert/strict";
import test from "node:test";
import { buildBackup } from "../backup/build-backup.ts";
import { parseBackup } from "../backup/parse-backup.ts";
import { restoreBackup } from "../backup/restore-backup.ts";
import type { BackupStorage } from "../backup/backup-types.ts";
import { parseBotTemplateFile } from "../bot-sharing/parse-bot-template-file.ts";
import { BOT_ID_MAX_LENGTH, isValidBotId } from "./bot-id.ts";
import {
  ACTIVE_BOT_STORAGE_KEY,
  loadActiveBotId,
  loadBotsFromStorage,
  parseBots,
  sanitizeBotProfile,
} from "./bot-storage.ts";
import { CREW_PRESETS } from "./crew-presets.ts";
import { DEFAULT_BOT } from "./bot-types.ts";
import { loadStoredMainBotId } from "./main-bot.ts";

class MemoryStorage implements BackupStorage {
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

const bot = (id: string, name = "Bot") => ({
  id,
  name,
  description: "d",
  avatarShape: "hexagon",
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const HOSTILE_IDS = [
  "a".repeat(BOT_ID_MAX_LENGTH + 1),
  "x".repeat(100_000),
  "has space",
  "new\nline",
  "slash/../escape",
  "emoji-😀",
  "__proto__",
  "constructor",
  "prototype",
];

test("legacy and generated ids are valid", () => {
  const legacy = [
    "default",
    "chief-of-staff",
    "bot_1730000000000_ab12c",
    "a",
    "a".repeat(BOT_ID_MAX_LENGTH),
    ...CREW_PRESETS.map((preset) => preset.id),
  ];
  for (const id of legacy) assert.equal(isValidBotId(id), true, id);
});

test("oversized, hostile and non-string ids are not valid", () => {
  for (const id of [...HOSTILE_IDS, "", 3, null, undefined, {}]) {
    assert.equal(isValidBotId(id), false, String(id).slice(0, 20));
  }
});

test("the sanitizer drops a bot whose id is oversized or hostile", () => {
  for (const id of HOSTILE_IDS) {
    assert.equal(sanitizeBotProfile(bot(id)), null, id.slice(0, 20));
  }
});

test("legacy ids still load, and the legacy default still upgrades", () => {
  const raw = JSON.stringify([
    bot("default", "OpenBot"),
    bot("bot_1730000000000_ab12c"),
    bot("inbox"),
  ]);
  const ids = parseBots(raw).map((b) => b.id);
  assert.deepEqual(ids, [DEFAULT_BOT.id, "bot_1730000000000_ab12c", "inbox"]);
});

test("a stored list drops bad ids and keeps the rest", () => {
  const raw = JSON.stringify([bot("x".repeat(5000)), bot("ok-1"), bot("a b")]);
  assert.deepEqual(
    parseBots(raw).map((b) => b.id),
    ["ok-1"],
  );
});

test("a stored active or main id that is not a plain id is ignored", () => {
  const s = new MemoryStorage();
  s.setItem(ACTIVE_BOT_STORAGE_KEY, "x".repeat(100_000));
  assert.equal(loadActiveBotId(s as unknown as Storage), DEFAULT_BOT.id);
  s.setItem("openbot_main_bot_id", "x".repeat(100_000));
  assert.equal(loadStoredMainBotId(s as unknown as Storage), null);
  s.setItem(ACTIVE_BOT_STORAGE_KEY, "bot_1_abc");
  s.setItem("openbot_main_bot_id", "chief-of-staff");
  assert.equal(loadActiveBotId(s as unknown as Storage), "bot_1_abc");
  assert.equal(loadStoredMainBotId(s as unknown as Storage), "chief-of-staff");
});

test("a backup drops bots, conversations and memory with bad ids", () => {
  const long = "k".repeat(BOT_ID_MAX_LENGTH + 1);
  const text = JSON.stringify({
    app: "openbot",
    version: 1,
    exportedAt: "2026-01-01T00:00:00.000Z",
    data: {
      bots: [bot(long), bot("good_1"), bot("bad id")],
      activeBotId: long,
      messages: {
        [long]: [{ id: 1, role: "user", language: "en", text: "x" }],
        good_1: [{ id: 1, role: "user", language: "en", text: "kept" }],
      },
      memory: { [long]: [{ id: "m", text: "n", createdAt: "2026-01-01" }] },
    },
  });
  const result = parseBackup(text);
  assert.ok(result.ok);
  const { data } = result.backup;
  assert.deepEqual(
    data.bots.map((b) => b.id),
    ["good_1"],
  );
  assert.equal(data.activeBotId, undefined);
  assert.deepEqual(Object.keys(data.messages), ["good_1"]);
  assert.deepEqual(Object.keys(data.memory), []);
});

test("a backup with only bad ids is rejected", () => {
  const text = JSON.stringify({
    app: "openbot",
    version: 1,
    exportedAt: "x",
    data: { bots: [bot("z".repeat(BOT_ID_MAX_LENGTH + 1))] },
  });
  assert.deepEqual(parseBackup(text), { ok: false, error: "invalid_file" });
});

test("a backup of legacy ids round-trips through storage", () => {
  const source = new MemoryStorage();
  source.setItem(
    "openbot_bots",
    JSON.stringify([bot("chief-of-staff"), bot("bot_1730000000000_ab12c")]),
  );
  source.setItem("openbot_msgs_bot_1730000000000_ab12c", "[]");
  const backup = buildBackup(source);
  const parsed = parseBackup(JSON.stringify(backup));
  assert.ok(parsed.ok);
  const target = new MemoryStorage();
  restoreBackup(parsed.backup, target, "replace");
  assert.deepEqual(
    loadBotsFromStorage(target as unknown as Storage).map((b) => b.id),
    ["chief-of-staff", "bot_1730000000000_ab12c"],
  );
});

test("a template file never carries a bot id into the form", () => {
  const text = JSON.stringify({
    app: "openbot",
    kind: "bot-template",
    version: 1,
    exportedAt: "x",
    bot: { ...bot("x".repeat(100_000)), skills: [] },
  });
  const result = parseBotTemplateFile(text);
  assert.ok(result.ok);
  assert.equal("id" in result.draft, false);
});
