import assert from "node:assert/strict";
import test from "node:test";
import { BACKUP_VERSION } from "../backup/backup-types.ts";
import { parseBackup } from "../backup/parse-backup.ts";
import { sanitizeStoredMessages } from "../chat/stored-message.ts";
import { applyCompaction } from "./apply-compaction.ts";
import { planCompaction } from "./plan-compaction.ts";
import { FULL, msg, thread } from "./thread-fixtures.ts";

function compacted() {
  const messages = thread(5);
  const plan = planCompaction(messages, FULL);
  assert.ok(plan);
  return applyCompaction(messages, plan, "Kept summary", new Date(0));
}

test("a compacted thread survives the stored-message round trip", () => {
  const original = compacted();
  const back = sanitizeStoredMessages(JSON.parse(JSON.stringify(original)));
  assert.deepEqual(back, original);
});

test("a damaged marker degrades to a plain reply, never throws", () => {
  const [marker] = sanitizeStoredMessages([
    { ...compacted()[0], compacted: { originalCount: "x", archived: 5 } },
  ]);
  assert.equal(marker.compacted, undefined);
  assert.equal(marker.text, "Kept summary");
});

test("archived entries are sanitized and cannot nest a marker", () => {
  const original = compacted();
  const nested = {
    ...original[0],
    compacted: {
      ...original[0].compacted,
      archived: [
        { ...msg(1, "user"), compacted: original[0].compacted },
        { id: "bad", role: "user", text: "x" },
        { ...msg(2, "assistant"), extra: "dropped" },
      ],
    },
  };
  const [marker] = sanitizeStoredMessages([nested]);
  const archived = marker.compacted?.archived ?? [];
  assert.equal(archived.length, 2);
  assert.ok(archived.every((m) => m.compacted === undefined));
  assert.ok(!("extra" in archived[1]));
});

test("a user message cannot carry a marker", () => {
  const [message] = sanitizeStoredMessages([
    { ...msg(1, "user"), compacted: compacted()[0].compacted },
  ]);
  assert.equal(message.compacted, undefined);
});

test("a backup keeps the marker and its archive", () => {
  const original = compacted();
  const file = JSON.stringify({
    app: "openbot",
    version: BACKUP_VERSION,
    exportedAt: "2026-01-01T00:00:00.000Z",
    data: {
      bots: [
        {
          id: "a",
          name: "a",
          description: "d",
          avatarShape: "hexagon",
          avatarColor: "cyan",
          skills: [],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      messages: { a: original },
    },
  });
  const parsed = parseBackup(file);
  assert.ok(parsed.ok);
  const marker = parsed.backup.data.messages.a[0];
  assert.equal(marker.text, "Kept summary");
  assert.equal(marker.compacted?.archived.length, 4);
  assert.equal(marker.compacted?.originalCount, 4);
});
