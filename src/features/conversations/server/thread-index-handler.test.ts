import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import {
  handleGetThreadIndex,
  handlePutThreadIndex,
} from "./thread-index-handler.ts";
import { THREAD_INDEX_MAX_PER_BOT } from "./thread-index-repository.ts";

async function withDb(run: (db: DatabaseSync) => Promise<void> | void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-thread-index-handler-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const URL_BASE = "http://localhost/api/conversations/threads";
const entry = (id: string) => ({
  id,
  title: null,
  pinned: true,
  createdAt: 1,
  updatedAt: 2,
});
const put = (db: DatabaseSync, qs: string, body: unknown) =>
  handlePutThreadIndex(
    new Request(`${URL_BASE}${qs}`, {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    db,
  );
const get = (db: DatabaseSync, qs: string) =>
  handleGetThreadIndex(new Request(`${URL_BASE}${qs}`), db);

test("PUT then GET returns the list with no-store", async () => {
  await withDb(async (db) => {
    const res = await put(db, "?botId=b1", { threads: [entry("default")] });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { botId: "b1", count: 1 });
    const read = await get(db, "?botId=b1");
    assert.equal(read.status, 200);
    assert.equal(read.headers.get("cache-control"), "no-store");
    assert.deepEqual(await read.json(), {
      botId: "b1",
      threads: [entry("default")],
    });
    assert.deepEqual(await (await get(db, "?botId=b2")).json(), {
      botId: "b2",
      threads: [],
    });
  });
});

test("a missing or invalid botId is a 400", async () => {
  await withDb(async (db) => {
    for (const qs of ["", "?botId=", "?botId=a%2Fb", "?botId=__proto__"]) {
      const g = await get(db, qs);
      assert.equal(g.status, 400);
      assert.deepEqual(await g.json(), { error: "invalid_bot_id" });
      assert.equal((await put(db, qs, { threads: [] })).status, 400);
    }
  });
});

test("bad bodies and entries are 400s", async () => {
  await withDb(async (db) => {
    for (const body of ["not json", "null", {}, { threads: "x" }]) {
      const res = await put(db, "?botId=b", body);
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: "invalid_body" });
    }
    const bad = await put(db, "?botId=b", { threads: [entry("a/b")] });
    assert.equal(bad.status, 400);
    assert.deepEqual(await bad.json(), { error: "invalid_thread" });
    const many = await put(db, "?botId=b", {
      threads: Array.from({ length: THREAD_INDEX_MAX_PER_BOT + 1 }, (_, i) =>
        entry(`t${i}`),
      ),
    });
    assert.deepEqual(await many.json(), { error: "too_many_threads" });
    assert.deepEqual((await (await get(db, "?botId=b")).json()).threads, []);
  });
});

test("an oversized body is a 413", async () => {
  await withDb(async (db) => {
    const res = await put(db, "?botId=b", {
      threads: [],
      pad: "x".repeat(70 * 1024),
    });
    assert.equal(res.status, 413);
  });
});
