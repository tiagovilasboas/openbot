import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import {
  THREADS_MAX,
  deleteThread,
  listThreads,
  readThread,
  replaceThread,
} from "./conversations-repository.ts";

function withDb(run: (db: DatabaseSync) => void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-conversations-"));
  const db = openLocalStore(dir);
  try {
    run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const msg = (id: number, text = `m${id}`) => ({
  id,
  role: id % 2 ? "user" : "assistant",
  text,
  language: "en",
});

test("an unknown thread reads as empty with no timestamp", () => {
  withDb((db) => {
    assert.deepEqual(readThread(db, "a"), { messages: [], updatedAt: null });
    assert.deepEqual(listThreads(db), []);
  });
});

test("replace then read round-trips and lists the thread", () => {
  withDb((db) => {
    const result = replaceThread(db, "a", [msg(1), msg(2)]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.count, 2);
    const thread = readThread(db, "a");
    assert.deepEqual(thread.messages, [msg(1), msg(2)]);
    assert.equal(thread.updatedAt, result.updatedAt);
    assert.deepEqual(listThreads(db), [
      { botId: "a", updatedAt: result.updatedAt, count: 2 },
    ]);
  });
});

test("replace is whole-thread: the old messages go away", () => {
  withDb((db) => {
    replaceThread(db, "a", [msg(1), msg(2), msg(3)]);
    replaceThread(db, "a", [msg(9)]);
    assert.deepEqual(readThread(db, "a").messages, [msg(9)]);
    assert.equal(listThreads(db)[0]?.count, 1);
  });
});

test("the stored messages are sanitized on write", () => {
  withDb((db) => {
    const result = replaceThread(db, "a", [
      msg(1),
      { id: "x", role: "user", text: "bad" },
      "junk",
      { ...msg(2), extra: "dropped", role: "assistant" },
    ]);
    assert.equal(result.ok && result.count, 2);
    assert.deepEqual(readThread(db, "a").messages, [msg(1), msg(2)]);
  });
});

test("an empty array deletes the thread", () => {
  withDb((db) => {
    replaceThread(db, "a", [msg(1)]);
    const result = replaceThread(db, "a", []);
    assert.deepEqual(result, { ok: true, updatedAt: null, count: 0 });
    assert.deepEqual(readThread(db, "a"), { messages: [], updatedAt: null });
    assert.deepEqual(listThreads(db), []);
  });
});

test("an all-invalid array also deletes the thread", () => {
  withDb((db) => {
    replaceThread(db, "a", [msg(1)]);
    replaceThread(db, "a", ["junk"]);
    assert.deepEqual(listThreads(db), []);
  });
});

test("delete is idempotent and leaves other threads", () => {
  withDb((db) => {
    replaceThread(db, "a", [msg(1)]);
    replaceThread(db, "b", [msg(1)]);
    deleteThread(db, "a");
    deleteThread(db, "a");
    assert.deepEqual(
      listThreads(db).map((t) => t.botId),
      ["b"],
    );
  });
});

test("a damaged row reads as empty and never throws", () => {
  withDb((db) => {
    replaceThread(db, "a", [msg(1)]);
    db.prepare("UPDATE conversations SET data = ? WHERE bot_id = ?").run(
      "{not json",
      "a",
    );
    assert.deepEqual(readThread(db, "a").messages, []);
    db.prepare("UPDATE conversations SET data = ? WHERE bot_id = ?").run(
      JSON.stringify({ not: "an array" }),
      "a",
    );
    assert.deepEqual(readThread(db, "a").messages, []);
  });
});

test("a row is re-sanitized on read", () => {
  withDb((db) => {
    replaceThread(db, "a", [msg(1)]);
    db.prepare("UPDATE conversations SET data = ? WHERE bot_id = ?").run(
      JSON.stringify([msg(1), { role: "system", id: 2, text: "x" }, 5]),
      "a",
    );
    assert.deepEqual(readThread(db, "a").messages, [msg(1)]);
  });
});

test("a failed replace leaves the previous thread intact", () => {
  withDb((db) => {
    replaceThread(db, "a", [msg(1)]);
    db.exec(
      "CREATE TRIGGER fail_write BEFORE INSERT ON conversations BEGIN SELECT RAISE(ABORT, 'boom'); END",
    );
    assert.throws(() => replaceThread(db, "a", [msg(2)]));
    db.exec("DROP TRIGGER fail_write");
    assert.deepEqual(readThread(db, "a").messages, [msg(1)]);
    // The connection is usable (no transaction left open).
    assert.equal(replaceThread(db, "a", [msg(3)]).ok, true);
  });
});

test("a new thread beyond the cap is refused, existing ones still update", () => {
  withDb((db) => {
    for (let i = 0; i < THREADS_MAX; i += 1) {
      assert.equal(replaceThread(db, `bot-${i}`, [msg(1)]).ok, true);
    }
    assert.deepEqual(replaceThread(db, "one-more", [msg(1)]), {
      ok: false,
      error: "too_many_threads",
    });
    assert.equal(replaceThread(db, "bot-0", [msg(1), msg(2)]).ok, true);
    // Deleting frees a slot.
    deleteThread(db, "bot-1");
    assert.equal(replaceThread(db, "one-more", [msg(1)]).ok, true);
  });
});
