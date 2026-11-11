import assert from "node:assert/strict";
import test from "node:test";
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

const BOT = {
  id: "a",
  name: "a",
  description: "d",
  avatarShape: "hexagon",
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function file(version: number, messages: unknown[]) {
  return JSON.stringify({
    app: "openbot",
    version,
    exportedAt: "2026-01-01T00:00:00.000Z",
    data: { bots: [BOT], messages: { a: messages } },
  });
}

const partial = {
  id: 2,
  role: "assistant",
  language: "en",
  text: "half",
  incomplete: "cancelled",
};
const sent = {
  id: 1,
  role: "user",
  language: "pt",
  text: "veja",
  attachments: [
    { name: "notes.md", size: 812 },
    { name: "big.txt", size: 4000, truncated: true },
  ],
};

test("a version 2 file keeps the incomplete flag and attachment names", () => {
  const parsed = parseBackup(file(2, [sent, partial]));
  assert.ok(parsed.ok);
  const [first, second] = parsed.backup.data.messages.a;
  assert.deepEqual(first.attachments, sent.attachments);
  assert.equal(second.incomplete, "cancelled");
});

test("a version 1 file still imports, with or without the new fields", () => {
  const plain = { id: 1, role: "user", language: "en", text: "hi" };
  const parsed = parseBackup(file(1, [plain, partial]));
  assert.ok(parsed.ok);
  const [first, second] = parsed.backup.data.messages.a;
  assert.equal("attachments" in first, false);
  assert.equal("incomplete" in first, false);
  assert.equal(second.incomplete, "cancelled");
});

test("a newer version than this app reads is refused", () => {
  assert.deepEqual(parseBackup(file(3, [])), {
    ok: false,
    error: "unsupported_version",
  });
  assert.deepEqual(parseBackup(file(0, [])), {
    ok: false,
    error: "unsupported_version",
  });
});

test("bad attachment and incomplete values are dropped, not trusted", () => {
  const parsed = parseBackup(
    file(2, [
      {
        ...sent,
        incomplete: "weird",
        attachments: [
          { name: "ok.txt", size: 5, text: "SECRET FILE BODY" },
          { name: "", size: 1 },
          { name: "neg.txt", size: -1 },
          { name: "nan.txt", size: "9" },
          "nope",
          { name: "d.txt", size: 1 },
          { name: "e.txt", size: 1 },
        ],
      },
      { ...sent, id: 2, attachments: "x" },
    ]),
  );
  assert.ok(parsed.ok);
  const [first, second] = parsed.backup.data.messages.a;
  assert.equal("incomplete" in first, false);
  assert.deepEqual(first.attachments, [
    { name: "ok.txt", size: 5 },
    { name: "d.txt", size: 1 },
    { name: "e.txt", size: 1 },
  ]);
  assert.equal("attachments" in second, false);
  assert.ok(!JSON.stringify(parsed.backup).includes("SECRET FILE BODY"));
});

test("round trip keeps both fields through export, import and restore", () => {
  const parsed = parseBackup(file(2, [sent, partial]));
  assert.ok(parsed.ok);
  const storage = new FakeStorage();
  restoreBackup(parsed.backup, storage, "replace");
  const exported = buildBackup(storage, "en");
  assert.equal(exported.version, 2);
  const again = parseBackup(JSON.stringify(exported));
  assert.ok(again.ok);
  assert.deepEqual(again.backup.data.messages.a, parsed.backup.data.messages.a);
});
