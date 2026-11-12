import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import { MEMORY_MAX_ENTRIES } from "../memory-entries.ts";
import {
  handleDeleteMemory,
  handleGetMemory,
  handlePutMemory,
} from "./memory-handler.ts";
import { MEMORY_BOTS_MAX } from "./memory-repository.ts";

async function withDb(run: (db: DatabaseSync) => Promise<void> | void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-memory-handler-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const URL_BASE = "http://localhost/api/memory";
const note = (n: number, text = `note ${n}`) => ({
  id: `mem_${n}`,
  text,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const get = (db: DatabaseSync, query = "") =>
  handleGetMemory(new Request(`${URL_BASE}${query}`), db);
const put = (db: DatabaseSync, query: string, body: unknown) =>
  handlePutMemory(
    new Request(`${URL_BASE}${query}`, {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    db,
  );
const del = (db: DatabaseSync, query: string) =>
  handleDeleteMemory(
    new Request(`${URL_BASE}${query}`, { method: "DELETE" }),
    db,
  );

test("GET list on an empty store returns no notes, uncached", async () => {
  await withDb(async (db) => {
    const response = get(db);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { notes: [] });
  });
});

test("GET one unknown bot returns empty entries and null updatedAt", async () => {
  await withDb(async (db) => {
    const response = get(db, "?botId=ghost");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      botId: "ghost",
      entries: [],
      updatedAt: null,
    });
  });
});

test("PUT stores the notes; GET reads them and the list shows them", async () => {
  await withDb(async (db) => {
    const response = await put(db, "?botId=a", { entries: [note(1), note(2)] });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const saved = await response.json();
    assert.equal(saved.botId, "a");
    assert.equal(saved.count, 2);
    assert.equal(typeof saved.updatedAt, "number");

    assert.deepEqual(await get(db, "?botId=a").json(), {
      botId: "a",
      entries: [note(1), note(2)],
      updatedAt: saved.updatedAt,
    });
    assert.deepEqual(await get(db).json(), {
      notes: [{ botId: "a", updatedAt: saved.updatedAt, count: 2 }],
    });
  });
});

test("PUT re-sanitizes: invalid entries are dropped, unknown fields too", async () => {
  await withDb(async (db) => {
    const response = await put(db, "?botId=a", {
      entries: [note(1), { id: "nope", text: "" }, { ...note(2), evil: "x" }],
    });
    assert.equal((await response.json()).count, 2);
    assert.deepEqual((await get(db, "?botId=a").json()).entries, [
      note(1),
      note(2),
    ]);
  });
});

test("PUT replaces the whole list", async () => {
  await withDb(async (db) => {
    await put(db, "?botId=a", { entries: [note(1), note(2), note(3)] });
    await put(db, "?botId=a", { entries: [note(7)] });
    assert.deepEqual((await get(db, "?botId=a").json()).entries, [note(7)]);
  });
});

test("PUT with nothing valid deletes the notes", async () => {
  await withDb(async (db) => {
    await put(db, "?botId=a", { entries: [note(1)] });
    for (const entries of [[], ["junk"]]) {
      await put(db, "?botId=a", { entries: [note(1)] });
      const response = await put(db, "?botId=a", { entries });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        botId: "a",
        updatedAt: null,
        count: 0,
      });
      assert.deepEqual(await get(db).json(), { notes: [] });
    }
  });
});

test("DELETE answers 204, is idempotent and removes the notes", async () => {
  await withDb(async (db) => {
    await put(db, "?botId=a", { entries: [note(1)] });
    const first = del(db, "?botId=a");
    assert.equal(first.status, 204);
    assert.equal(first.headers.get("cache-control"), "no-store");
    assert.equal(del(db, "?botId=a").status, 204);
    assert.deepEqual(await get(db).json(), { notes: [] });
  });
});

test("a missing or malformed botId is invalid_bot_id on every method", async () => {
  await withDb(async (db) => {
    const bad = ["", "?botId=", "?botId=has%20space", "?botId=__proto__"];
    bad.push(`?botId=${"x".repeat(65)}`, "?botId=a%2Fb");
    for (const query of bad) {
      const reads = query === "" ? [] : [get(db, query)];
      const responses = [
        ...reads,
        await put(db, query, { entries: [] }),
        del(db, query),
      ];
      for (const response of responses) {
        assert.equal(response.status, 400, query);
        assert.deepEqual(await response.json(), { error: "invalid_bot_id" });
      }
    }
  });
});

test("PUT with unparseable JSON or a non-array entries is invalid_body", async () => {
  await withDb(async (db) => {
    const bodies: unknown[] = [
      "{not json",
      "",
      "null",
      "[]",
      {},
      { entries: "x" },
      { entries: { length: 1 } },
    ];
    for (const body of bodies) {
      const response = await put(db, "?botId=a", body);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "invalid_body" });
    }
  });
});

test("PUT with more entries than the cap is too_many_entries, nothing stored", async () => {
  await withDb(async (db) => {
    await put(db, "?botId=a", { entries: [note(1)] });
    const many = Array.from({ length: MEMORY_MAX_ENTRIES + 1 }, (_, i) =>
      note(i),
    );
    const response = await put(db, "?botId=a", { entries: many });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "too_many_entries" });
    assert.deepEqual((await get(db, "?botId=a").json()).entries, [note(1)]);
    const exactly = many.slice(0, MEMORY_MAX_ENTRIES);
    assert.equal((await put(db, "?botId=a", { entries: exactly })).status, 200);
  });
});

test("PUT over the body cap is payload_too_large", async () => {
  await withDb(async (db) => {
    const response = await put(db, "?botId=a", "x".repeat(512 * 1024 + 1));
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "payload_too_large" });
    assert.deepEqual(await get(db).json(), { notes: [] });
  });
});

test("a new bot at the cap is too_many_bots; an existing one still saves", async () => {
  await withDb(async (db) => {
    for (let i = 0; i < MEMORY_BOTS_MAX; i += 1) {
      await put(db, `?botId=bot-${i}`, { entries: [note(1)] });
    }
    const refused = await put(db, "?botId=extra", { entries: [note(1)] });
    assert.equal(refused.status, 400);
    assert.deepEqual(await refused.json(), { error: "too_many_bots" });
    assert.equal(
      (await put(db, "?botId=bot-0", { entries: [note(2)] })).status,
      200,
    );
  });
});

test("a damaged row GETs as empty entries with a 200", async () => {
  await withDb(async (db) => {
    await put(db, "?botId=a", { entries: [note(1)] });
    db.prepare("UPDATE bot_memory SET data = ? WHERE bot_id = ?").run(
      "garbage",
      "a",
    );
    const response = get(db, "?botId=a");
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).entries, []);
  });
});
