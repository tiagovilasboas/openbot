import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import {
  MEMORY_BOTS_MAX,
  deleteNotes,
  listNotes,
  readNotes,
  replaceNotes,
} from "./memory-repository.ts";

function withDb(run: (db: DatabaseSync) => void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-memory-"));
  const db = openLocalStore(dir);
  try {
    run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const note = (n: number, text = `note ${n}`) => ({
  id: `mem_${n}`,
  text,
  createdAt: "2026-01-01T00:00:00.000Z",
});

test("unknown notes read as empty with no timestamp", () => {
  withDb((db) => {
    assert.deepEqual(readNotes(db, "a"), { entries: [], updatedAt: null });
    assert.deepEqual(listNotes(db), []);
  });
});

test("replace then read round-trips and lists the bot", () => {
  withDb((db) => {
    const result = replaceNotes(db, "a", [note(1), note(2)]);
    assert.equal(result.ok && result.count, 2);
    if (!result.ok) return;
    const stored = readNotes(db, "a");
    assert.deepEqual(stored.entries, [note(1), note(2)]);
    assert.equal(stored.updatedAt, result.updatedAt);
    assert.deepEqual(listNotes(db), [
      { botId: "a", updatedAt: result.updatedAt, count: 2 },
    ]);
  });
});

test("replace is whole-list: the old notes go away", () => {
  withDb((db) => {
    replaceNotes(db, "a", [note(1), note(2), note(3)]);
    replaceNotes(db, "a", [note(9)]);
    assert.deepEqual(readNotes(db, "a").entries, [note(9)]);
  });
});

test("the stored notes are sanitized on write", () => {
  withDb((db) => {
    const result = replaceNotes(db, "a", [
      note(1),
      { id: "x", text: "   " },
      "junk",
      { ...note(2), extra: "dropped" },
    ]);
    assert.equal(result.ok && result.count, 2);
    assert.deepEqual(readNotes(db, "a").entries, [note(1), note(2)]);
  });
});

test("an empty or all-invalid list deletes the row", () => {
  withDb((db) => {
    replaceNotes(db, "a", [note(1)]);
    assert.deepEqual(replaceNotes(db, "a", []), {
      ok: true,
      updatedAt: null,
      count: 0,
    });
    assert.deepEqual(listNotes(db), []);
    replaceNotes(db, "a", [note(1)]);
    replaceNotes(db, "a", ["junk"]);
    assert.deepEqual(readNotes(db, "a"), { entries: [], updatedAt: null });
  });
});

test("delete is idempotent and leaves other bots", () => {
  withDb((db) => {
    replaceNotes(db, "a", [note(1)]);
    replaceNotes(db, "b", [note(1)]);
    deleteNotes(db, "a");
    deleteNotes(db, "a");
    assert.deepEqual(
      listNotes(db).map((n) => n.botId),
      ["b"],
    );
  });
});

test("a damaged row reads as empty and never throws", () => {
  withDb((db) => {
    replaceNotes(db, "a", [note(1)]);
    db.prepare("UPDATE bot_memory SET data = ? WHERE bot_id = ?").run(
      "{not json",
      "a",
    );
    assert.deepEqual(readNotes(db, "a").entries, []);
    db.prepare("UPDATE bot_memory SET data = ? WHERE bot_id = ?").run(
      JSON.stringify({ not: "an array" }),
      "a",
    );
    assert.deepEqual(readNotes(db, "a").entries, []);
  });
});

test("a row is re-sanitized on read", () => {
  withDb((db) => {
    replaceNotes(db, "a", [note(1)]);
    db.prepare("UPDATE bot_memory SET data = ? WHERE bot_id = ?").run(
      JSON.stringify([note(1), { text: "" }, 5]),
      "a",
    );
    assert.deepEqual(readNotes(db, "a").entries, [note(1)]);
  });
});

test("a failed replace leaves the previous notes intact", () => {
  withDb((db) => {
    replaceNotes(db, "a", [note(1)]);
    db.exec(
      "CREATE TRIGGER fail_write BEFORE INSERT ON bot_memory BEGIN SELECT RAISE(ABORT, 'boom'); END",
    );
    assert.throws(() => replaceNotes(db, "a", [note(2)]));
    db.exec("DROP TRIGGER fail_write");
    assert.deepEqual(readNotes(db, "a").entries, [note(1)]);
    // The connection is usable (no transaction left open).
    assert.equal(replaceNotes(db, "a", [note(3)]).ok, true);
  });
});

test("a new bot beyond the cap is refused, existing ones still update", () => {
  withDb((db) => {
    for (let i = 0; i < MEMORY_BOTS_MAX; i += 1) {
      assert.equal(replaceNotes(db, `bot-${i}`, [note(1)]).ok, true);
    }
    assert.deepEqual(replaceNotes(db, "one-more", [note(1)]), {
      ok: false,
      error: "too_many_bots",
    });
    assert.equal(replaceNotes(db, "bot-0", [note(1), note(2)]).ok, true);
    // Deleting frees a slot.
    deleteNotes(db, "bot-1");
    assert.equal(replaceNotes(db, "one-more", [note(1)]).ok, true);
  });
});
