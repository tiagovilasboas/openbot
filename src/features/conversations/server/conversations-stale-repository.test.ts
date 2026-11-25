import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import {
  listThreads,
  readThread,
  replaceThread,
} from "./conversations-repository.ts";

function withDb(run: (db: DatabaseSync) => void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-conversations-stale-"));
  const db = openLocalStore(dir);
  try {
    run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const msg = (id: number) => ({
  id,
  role: id % 2 ? "user" : "assistant",
  text: `m${id}`,
  language: "en",
});

function seed(db: DatabaseSync): number {
  const first = replaceThread(db, "a", [msg(1)]);
  if (!first.ok || first.updatedAt === null) throw new Error("seed failed");
  return first.updatedAt;
}

test("a base matching the stored updatedAt writes", () => {
  withDb((db) => {
    const at = seed(db);
    const next = replaceThread(db, "a", [msg(1), msg(2)], "default", at);
    assert.equal(next.ok, true);
    assert.equal(readThread(db, "a").messages.length, 2);
  });
});

test("a stale base is refused with the stored value and writes nothing", () => {
  withDb((db) => {
    const at = seed(db);
    const result = replaceThread(db, "a", [msg(1), msg(2)], "default", at - 1);
    assert.deepEqual(result, { ok: false, error: "stale", updatedAt: at });
    assert.deepEqual(readThread(db, "a"), {
      messages: [msg(1)],
      updatedAt: at,
    });
  });
});

test("without a base the write is unconditional", () => {
  withDb((db) => {
    seed(db);
    assert.equal(replaceThread(db, "a", [msg(2)]).ok, true);
  });
});

test("a null base on a missing row writes", () => {
  withDb((db) => {
    assert.equal(replaceThread(db, "a", [msg(1)], "default", null).ok, true);
  });
});

test("a null base on an existing row is stale", () => {
  withDb((db) => {
    const at = seed(db);
    const result = replaceThread(db, "a", [msg(2)], "default", null);
    assert.deepEqual(result, { ok: false, error: "stale", updatedAt: at });
    assert.deepEqual(readThread(db, "a").messages, [msg(1)]);
  });
});

test("a numeric base on a missing row is stale with null", () => {
  withDb((db) => {
    const result = replaceThread(db, "a", [msg(1)], "default", 123);
    assert.deepEqual(result, { ok: false, error: "stale", updatedAt: null });
    assert.deepEqual(listThreads(db), []);
  });
});

test("a stale base also blocks an emptying write", () => {
  withDb((db) => {
    seed(db);
    assert.equal(replaceThread(db, "a", [], "default", 1).ok, false);
    assert.equal(readThread(db, "a").messages.length, 1);
  });
});

test("two writes in one millisecond still get different versions", () => {
  withDb((db) => {
    const first = replaceThread(db, "a", [msg(1)]);
    const second = replaceThread(db, "a", [msg(1), msg(2)]);
    assert.ok(first.ok && second.ok);
    if (!first.ok || !second.ok) return;
    assert.ok((second.updatedAt ?? 0) > (first.updatedAt ?? 0));
    const stale = replaceThread(db, "a", [msg(3)], "default", first.updatedAt);
    assert.equal(stale.ok, false);
  });
});
