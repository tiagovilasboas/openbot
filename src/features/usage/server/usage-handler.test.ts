import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import type { UsageRecord } from "../usage-record.ts";
import {
  handleDeleteUsage,
  handleGetUsage,
  handlePutUsage,
  USAGE_RECORDS_MAX,
} from "./usage-handler.ts";
import { ensureUsageSchema } from "./usage-schema.ts";

async function withDb(run: (db: DatabaseSync) => Promise<void> | void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-usage-handler-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const rec = (botId: string, day = "2026-01-02", calls = 1): UsageRecord => ({
  botId,
  day,
  inputTokens: 10,
  outputTokens: 5,
  calls,
  callsWithoutUsage: 0,
});

const put = (db: DatabaseSync, body: unknown) =>
  handlePutUsage(
    new Request("http://localhost/api/usage", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    db,
  );

test("GET on an empty store returns no records, uncached", async () => {
  await withDb(async (db) => {
    const response = handleGetUsage(db);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { records: [], updatedAt: null });
  });
});

test("PUT stores the log and GET reads it back", async () => {
  await withDb(async (db) => {
    const response = await put(db, { records: [rec("a"), rec("b")] });
    assert.equal(response.status, 200);
    const saved = (await response.json()) as {
      updatedAt: number;
      count: number;
    };
    assert.equal(saved.count, 2);
    assert.equal(typeof saved.updatedAt, "number");
    const read = (await handleGetUsage(db).json()) as {
      records: UsageRecord[];
      updatedAt: number;
    };
    assert.deepEqual(read.records, [rec("a"), rec("b")]);
    assert.equal(read.updatedAt, saved.updatedAt);
  });
});

test("PUT replaces the whole log: the last write wins", async () => {
  await withDb(async (db) => {
    await put(db, { records: [rec("a"), rec("b")] });
    await put(db, { records: [rec("c")] });
    const read = (await handleGetUsage(db).json()) as {
      records: UsageRecord[];
    };
    assert.deepEqual(read.records, [rec("c")]);
  });
});

test("PUT sanitizes: bad records are dropped", async () => {
  await withDb(async (db) => {
    const response = await put(db, {
      records: [rec("a"), { botId: "a", day: "nope" }, 7, null],
    });
    assert.equal(((await response.json()) as { count: number }).count, 1);
  });
});

test("PUT with nothing valid clears the log", async () => {
  await withDb(async (db) => {
    await put(db, { records: [rec("a")] });
    const response = await put(db, { records: [{ junk: true }] });
    assert.deepEqual(await response.json(), { updatedAt: null, count: 0 });
    assert.deepEqual(await handleGetUsage(db).json(), {
      records: [],
      updatedAt: null,
    });
  });
});

test("PUT with an empty list clears the log", async () => {
  await withDb(async (db) => {
    await put(db, { records: [rec("a")] });
    await put(db, { records: [] });
    assert.deepEqual(await handleGetUsage(db).json(), {
      records: [],
      updatedAt: null,
    });
  });
});

test("PUT rejects a body that is not { records: [] }", async () => {
  await withDb(async (db) => {
    for (const body of ["not json", { records: "x" }, [], { other: 1 }]) {
      const response = await put(db, body);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "invalid_body" });
    }
  });
});

test("PUT rejects more records than the cap", async () => {
  await withDb(async (db) => {
    const response = await put(db, {
      records: new Array(USAGE_RECORDS_MAX + 1).fill(0),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "too_many_records" });
  });
});

test("PUT refuses a body over the limit with 413", async () => {
  await withDb(async (db) => {
    const response = await put(db, "x".repeat(2 * 1024 * 1024 + 64 * 1024 + 1));
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "payload_too_large" });
  });
});

test("DELETE clears the log and is idempotent", async () => {
  await withDb(async (db) => {
    await put(db, { records: [rec("a")] });
    assert.equal(handleDeleteUsage(db).status, 204);
    assert.equal(handleDeleteUsage(db).status, 204);
    assert.deepEqual(await handleGetUsage(db).json(), {
      records: [],
      updatedAt: null,
    });
  });
});

test("damaged stored data reads as an empty log", async () => {
  await withDb(async (db) => {
    ensureUsageSchema(db);
    db.prepare(
      "INSERT INTO usage_log (id, data, count, updated_at) VALUES (1, 'not json', 1, 5)",
    ).run();
    assert.deepEqual(await handleGetUsage(db).json(), {
      records: [],
      updatedAt: 5,
    });
  });
});
