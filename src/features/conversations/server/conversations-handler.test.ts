import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import {
  handleDeleteConversation,
  handleGetConversations,
  handlePutConversation,
} from "./conversations-handler.ts";
import { THREADS_MAX } from "./conversations-repository.ts";

async function withDb(run: (db: DatabaseSync) => Promise<void> | void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-conversations-handler-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const URL_BASE = "http://localhost/api/conversations";
const msg = (id: number, text = `m${id}`) => ({
  id,
  role: id % 2 ? "user" : "assistant",
  text,
  language: "en",
});

const get = (db: DatabaseSync, query = "") =>
  handleGetConversations(new Request(`${URL_BASE}${query}`), db);
const put = (db: DatabaseSync, query: string, body: unknown) =>
  handlePutConversation(
    new Request(`${URL_BASE}${query}`, {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    db,
  );
const del = (db: DatabaseSync, query: string) =>
  handleDeleteConversation(
    new Request(`${URL_BASE}${query}`, { method: "DELETE" }),
    db,
  );

test("GET list on an empty store returns no threads, uncached", async () => {
  await withDb(async (db) => {
    const response = get(db);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { threads: [] });
  });
});

test("GET one unknown thread returns empty messages and null updatedAt", async () => {
  await withDb(async (db) => {
    const response = get(db, "?botId=ghost");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      botId: "ghost",
      messages: [],
      updatedAt: null,
    });
  });
});

test("PUT stores a thread; GET reads it and the list shows it", async () => {
  await withDb(async (db) => {
    const response = await put(db, "?botId=a", {
      messages: [msg(1), msg(2)],
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const saved = await response.json();
    assert.equal(saved.botId, "a");
    assert.equal(saved.count, 2);
    assert.equal(typeof saved.updatedAt, "number");

    const one = await get(db, "?botId=a").json();
    assert.deepEqual(one, {
      botId: "a",
      messages: [msg(1), msg(2)],
      updatedAt: saved.updatedAt,
    });
    const list = await get(db).json();
    assert.deepEqual(list, {
      threads: [{ botId: "a", updatedAt: saved.updatedAt, count: 2 }],
    });
  });
});

test("PUT re-sanitizes: invalid entries are dropped, unknown fields too", async () => {
  await withDb(async (db) => {
    const response = await put(db, "?botId=a", {
      messages: [msg(1), { id: "nope" }, { ...msg(2), evil: "<script>" }],
    });
    assert.equal((await response.json()).count, 2);
    const one = await get(db, "?botId=a").json();
    assert.deepEqual(one.messages, [msg(1), msg(2)]);
  });
});

test("PUT replaces the whole thread", async () => {
  await withDb(async (db) => {
    await put(db, "?botId=a", { messages: [msg(1), msg(2), msg(3)] });
    await put(db, "?botId=a", { messages: [msg(7)] });
    assert.deepEqual((await get(db, "?botId=a").json()).messages, [msg(7)]);
  });
});

test("PUT with an empty array deletes the thread", async () => {
  await withDb(async (db) => {
    await put(db, "?botId=a", { messages: [msg(1)] });
    const response = await put(db, "?botId=a", { messages: [] });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      botId: "a",
      updatedAt: null,
      count: 0,
    });
    assert.deepEqual(await get(db).json(), { threads: [] });
  });
});

test("DELETE answers 204, is idempotent and removes the thread", async () => {
  await withDb(async (db) => {
    await put(db, "?botId=a", { messages: [msg(1)] });
    const first = del(db, "?botId=a");
    assert.equal(first.status, 204);
    assert.equal(first.headers.get("cache-control"), "no-store");
    assert.equal(del(db, "?botId=a").status, 204);
    assert.deepEqual(await get(db).json(), { threads: [] });
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
        await put(db, query, { messages: [] }),
        del(db, query),
      ];
      for (const response of responses) {
        assert.equal(response.status, 400, query);
        assert.deepEqual(await response.json(), { error: "invalid_bot_id" });
      }
    }
  });
});

test("PUT with unparseable JSON or a non-array messages is invalid_body", async () => {
  await withDb(async (db) => {
    const bodies: unknown[] = [
      "{not json",
      "",
      "null",
      "[]",
      {},
      { messages: "x" },
      { messages: { length: 1 } },
    ];
    for (const body of bodies) {
      const response = await put(db, "?botId=a", body);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "invalid_body" });
    }
  });
});

test("PUT with more than 500 messages is too_many_messages, nothing stored", async () => {
  await withDb(async (db) => {
    await put(db, "?botId=a", { messages: [msg(1)] });
    const many = Array.from({ length: 501 }, (_, i) => msg(i));
    const response = await put(db, "?botId=a", { messages: many });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "too_many_messages" });
    assert.deepEqual((await get(db, "?botId=a").json()).messages, [msg(1)]);
    const exactly = Array.from({ length: 500 }, (_, i) => msg(i));
    assert.equal(
      (await put(db, "?botId=a", { messages: exactly })).status,
      200,
    );
  });
});

test("PUT over the body cap is payload_too_large, by header or by stream", async () => {
  await withDb(async (db) => {
    const big = "x".repeat(8 * 1024 * 1024 + 1);
    const response = await put(db, "?botId=a", big);
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { error: "payload_too_large" });
    assert.deepEqual(await get(db).json(), { threads: [] });
  });
});

test("a new thread at the cap is too_many_threads; an existing one still saves", async () => {
  await withDb(async (db) => {
    for (let i = 0; i < THREADS_MAX; i += 1) {
      await put(db, `?botId=bot-${i}`, { messages: [msg(1)] });
    }
    const refused = await put(db, "?botId=extra", { messages: [msg(1)] });
    assert.equal(refused.status, 400);
    assert.deepEqual(await refused.json(), { error: "too_many_threads" });
    const existing = await put(db, "?botId=bot-0", { messages: [msg(2)] });
    assert.equal(existing.status, 200);
  });
});

test("GET list orders the newest thread first", async () => {
  await withDb(async (db) => {
    await put(db, "?botId=old", { messages: [msg(1)] });
    db.prepare("UPDATE conversations SET updated_at = 1 WHERE bot_id = ?").run(
      "old",
    );
    await put(db, "?botId=new", { messages: [msg(1)] });
    const { threads } = await get(db).json();
    assert.deepEqual(
      threads.map((t: { botId: string }) => t.botId),
      ["new", "old"],
    );
  });
});

test("a damaged row GETs as empty messages with a 200", async () => {
  await withDb(async (db) => {
    await put(db, "?botId=a", { messages: [msg(1)] });
    db.prepare("UPDATE conversations SET data = ? WHERE bot_id = ?").run(
      "garbage",
      "a",
    );
    const response = get(db, "?botId=a");
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).messages, []);
  });
});
