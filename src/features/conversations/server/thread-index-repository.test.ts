import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import {
  THREAD_INDEX_MAX_PER_BOT,
  THREAD_INDEX_TITLE_MAX,
  isValidThreadId,
  readThreadIndex,
  replaceThreadIndex,
} from "./thread-index-repository.ts";

function withDb(run: (db: DatabaseSync) => void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-thread-index-"));
  const db = openLocalStore(dir);
  try {
    run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const entry = (id: string, extra: object = {}) => ({
  id,
  title: `t-${id}`,
  pinned: false,
  createdAt: 1,
  updatedAt: 2,
  ...extra,
});

test("an unknown bot has an empty list", () => {
  withDb((db) => assert.deepEqual(readThreadIndex(db, "a"), []));
});

test("a list round-trips in order, with null titles and pins", () => {
  withDb((db) => {
    const list = [
      entry("default", { title: null }),
      entry("z9", { pinned: true }),
      entry("a1"),
    ];
    assert.deepEqual(replaceThreadIndex(db, "bot", list), { ok: true });
    assert.deepEqual(readThreadIndex(db, "bot"), list);
  });
});

test("replace drops threads missing from the new list", () => {
  withDb((db) => {
    replaceThreadIndex(db, "bot", [entry("a"), entry("b")]);
    replaceThreadIndex(db, "bot", [entry("b", { title: "new" })]);
    assert.deepEqual(readThreadIndex(db, "bot"), [
      entry("b", { title: "new" }),
    ]);
    replaceThreadIndex(db, "bot", []);
    assert.deepEqual(readThreadIndex(db, "bot"), []);
  });
});

test("bots are isolated and may reuse thread ids", () => {
  withDb((db) => {
    replaceThreadIndex(db, "one", [entry("x")]);
    replaceThreadIndex(db, "two", [entry("x", { title: "other" })]);
    replaceThreadIndex(db, "one", []);
    assert.equal(readThreadIndex(db, "two")[0]?.title, "other");
  });
});

test("caps: too many threads, long title, duplicates, bad entries", () => {
  withDb((db) => {
    replaceThreadIndex(db, "bot", [entry("keep")]);
    const many = Array.from({ length: THREAD_INDEX_MAX_PER_BOT + 1 }, (_, i) =>
      entry(`t${i}`),
    );
    assert.deepEqual(replaceThreadIndex(db, "bot", many), {
      ok: false,
      error: "too_many_threads",
    });
    assert.deepEqual(readThreadIndex(db, "bot"), [entry("keep")]);
    const full = many.slice(0, THREAD_INDEX_MAX_PER_BOT);
    assert.deepEqual(replaceThreadIndex(db, "bot", full), { ok: true });
    const bad = [
      entry("a", { title: "x".repeat(THREAD_INDEX_TITLE_MAX + 1) }),
      entry("a~b"),
      entry("a", { createdAt: -1 }),
      entry("a", { pinned: "yes" }),
      null,
      "str",
    ];
    for (const b of bad) {
      assert.deepEqual(replaceThreadIndex(db, "bot", [b]), {
        ok: false,
        error: "invalid_thread",
      });
    }
    assert.deepEqual(replaceThreadIndex(db, "bot", [entry("a"), entry("a")]), {
      ok: false,
      error: "duplicate_thread",
    });
    assert.equal(readThreadIndex(db, "bot").length, THREAD_INDEX_MAX_PER_BOT);
  });
});

test("thread id rule", () => {
  assert.ok(isValidThreadId("default"));
  assert.ok(isValidThreadId("t_1700-abc"));
  for (const id of ["", "a~b", "a b", "__proto__", "x".repeat(65), 1, null]) {
    assert.equal(isValidThreadId(id), false);
  }
});
