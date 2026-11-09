import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import {
  buildBackup,
  backupFileName,
  summarizeBackup,
} from "./build-backup.ts";
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

const SECRET_KEYS = [
  "openbot_model_config",
  "openbot_provider_keys",
  "openbot_github_token",
  "openbot_access_token",
  "openbot_auth_credentials",
  "openbot_auth_unlocked",
  "openbot_custom_skills",
  "openbot_some_future_key",
];

const bot = (id: string, name = id) => ({
  id,
  name,
  description: "d",
  avatarShape: "hexagon",
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const msg = (id: number, text: string) => ({
  id,
  language: "en",
  role: "user",
  text,
});

function seeded(): FakeStorage {
  const s = new FakeStorage();
  s.setItem("openbot_bots", JSON.stringify([bot("a"), bot("b")]));
  s.setItem("openbot_active_bot_id", "b");
  s.setItem("openbot_main_bot_id", "a");
  s.setItem("openbot_msgs_a", JSON.stringify([msg(1, "hello")]));
  for (const key of SECRET_KEYS) s.setItem(key, "SECRET-VALUE-1234");
  return s;
}

const envelope = (data: unknown, over: object = {}) =>
  JSON.stringify({
    app: "openbot",
    version: 1,
    exportedAt: "2026-01-01T00:00:00.000Z",
    data,
    ...over,
  });

test("buildBackup never exports secrets or unknown keys", () => {
  const text = JSON.stringify(buildBackup(seeded(), "en"));
  assert.ok(!text.includes("SECRET-VALUE-1234"));
  for (const key of SECRET_KEYS) assert.ok(!text.includes(key));
});

test("buildBackup collects bots, ids, messages and language", () => {
  const backup = buildBackup(seeded(), "pt", new Date("2026-03-04T10:00:00Z"));
  assert.equal(backup.app, "openbot");
  assert.equal(backup.version, 1);
  assert.equal(backup.exportedAt, "2026-03-04T10:00:00.000Z");
  assert.equal(backup.data.bots.length, 2);
  assert.equal(backup.data.activeBotId, "b");
  assert.equal(backup.data.mainBotId, "a");
  assert.equal(backup.data.language, "pt");
  assert.deepEqual(Object.keys(backup.data.messages), ["a"]);
  assert.deepEqual(summarizeBackup(backup), { bots: 2, conversations: 1 });
  assert.equal(
    backupFileName(new Date("2026-03-04T10:00:00Z")),
    "openbot-backup-2026-03-04.json",
  );
});

test("an empty storage exports the crew presets", () => {
  const backup = buildBackup(new FakeStorage());
  assert.equal(backup.data.bots.length, CREW_PRESETS.length);
});

test("round trip: build, parse and restore into a fresh storage", () => {
  const original = buildBackup(seeded(), "en");
  const parsed = parseBackup(JSON.stringify(original));
  assert.ok(parsed.ok);
  const target = new FakeStorage();
  restoreBackup(parsed.backup, target, "replace");
  const again = buildBackup(target, "en", new Date(original.exportedAt));
  assert.deepEqual(again.data.bots, original.data.bots);
  assert.deepEqual(again.data.messages, original.data.messages);
  assert.equal(again.data.activeBotId, "b");
  assert.equal(again.data.mainBotId, "a");
});

test("parseBackup returns typed errors", () => {
  assert.deepEqual(parseBackup("not json"), {
    ok: false,
    error: "invalid_file",
  });
  assert.deepEqual(parseBackup("[]"), { ok: false, error: "invalid_file" });
  assert.deepEqual(parseBackup(42), { ok: false, error: "invalid_file" });
  assert.deepEqual(parseBackup(envelope({ bots: [] }, { app: "x" })), {
    ok: false,
    error: "invalid_file",
  });
  assert.deepEqual(
    parseBackup(envelope({ bots: [bot("a")] }, { version: 2 })),
    {
      ok: false,
      error: "unsupported_version",
    },
  );
  assert.deepEqual(parseBackup(envelope({ bots: "nope" })), {
    ok: false,
    error: "invalid_file",
  });
  assert.deepEqual(parseBackup(envelope({ bots: [] })), {
    ok: false,
    error: "invalid_file",
  });
  assert.deepEqual(parseBackup(" ".repeat(5 * 1024 * 1024 + 1)), {
    ok: false,
    error: "too_large",
  });
});

test("hostile bots and messages are dropped or clamped", () => {
  const huge = Array.from({ length: 101 }, (_, i) => bot(`b${i}`));
  assert.deepEqual(parseBackup(envelope({ bots: huge })), {
    ok: false,
    error: "invalid_file",
  });

  const many = Array.from({ length: 900 }, (_, i) => msg(i + 1, "x"));
  const result = parseBackup(
    envelope({
      bots: [bot("a"), { id: 7 }, null, "str", bot("a")],
      messages: {
        a: [
          ...many,
          { id: "1", role: "user", text: "bad id" },
          { id: 2, role: "root", text: "bad role" },
          { id: 3, role: "user", text: 5 },
          msg(4000, "y".repeat(50_000)),
        ],
        ghost: [msg(1, "orphan")],
        b: "not a list",
      },
    }),
  );
  assert.ok(result.ok);
  assert.equal(result.backup.data.bots.length, 1);
  const list = result.backup.data.messages.a!;
  assert.equal(list.length, 500);
  assert.equal(list.at(-1)!.text.length, 20_000);
  assert.deepEqual(Object.keys(result.backup.data.messages), ["a"]);
});

test("prototype pollution keys never take effect", () => {
  const text = `{"app":"openbot","version":1,"data":{"__proto__":{"polluted":1},
    "bots":[{"id":"__proto__","name":"evil"},{"id":"a","name":"A","__proto__":{"polluted":1}}],
    "messages":{"__proto__":[{"id":1,"role":"user","text":"x"}],"constructor":[],
    "a":[{"id":1,"role":"user","text":"ok","__proto__":{"polluted":1}}]}}}`;
  const result = parseBackup(text);
  assert.ok(result.ok);
  assert.deepEqual(
    result.backup.data.bots.map((b) => b.id),
    ["a"],
  );
  assert.deepEqual(Object.keys(result.backup.data.messages), ["a"]);
  assert.equal(Object.getPrototypeOf(result.backup.data.messages), null);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test("unknown ids for active and main bot are ignored", () => {
  const result = parseBackup(
    envelope({ bots: [bot("a")], activeBotId: "zzz", mainBotId: 4 }),
  );
  assert.ok(result.ok);
  assert.equal(result.backup.data.activeBotId, undefined);
  assert.equal(result.backup.data.mainBotId, undefined);
});

test("replace swaps bots and conversations and touches no secrets", () => {
  const target = seeded();
  const parsed = parseBackup(
    envelope({
      bots: [bot("c")],
      activeBotId: "c",
      messages: { c: [msg(1, "new")] },
    }),
  );
  assert.ok(parsed.ok);
  const summary = restoreBackup(parsed.backup, target, "replace");
  assert.deepEqual(summary, { bots: 1, conversations: 1 });
  assert.equal(target.getItem("openbot_msgs_a"), null);
  assert.ok(target.getItem("openbot_msgs_c"));
  assert.equal(target.getItem("openbot_active_bot_id"), "c");
  for (const key of SECRET_KEYS) {
    assert.equal(target.getItem(key), "SECRET-VALUE-1234");
  }
});

test("merge keeps existing bots and messages and adds new ids", () => {
  const target = seeded();
  const parsed = parseBackup(
    envelope({
      bots: [bot("a", "Renamed"), bot("c")],
      messages: { a: [msg(9, "from file")], c: [msg(1, "new")] },
    }),
  );
  assert.ok(parsed.ok);
  const summary = restoreBackup(parsed.backup, target, "merge");
  assert.deepEqual(summary, { bots: 1, conversations: 1 });
  const bots = JSON.parse(target.getItem("openbot_bots")!) as {
    id: string;
    name: string;
  }[];
  assert.deepEqual(
    bots.map((b) => b.id),
    ["a", "b", "c"],
  );
  assert.equal(bots[0]!.name, "a");
  assert.match(target.getItem("openbot_msgs_a")!, /hello/);
  assert.match(target.getItem("openbot_msgs_c")!, /new/);
  assert.equal(target.getItem("openbot_active_bot_id"), "b");
});
