import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import {
  handleGetConversations,
  handlePutConversation,
} from "./conversations-handler.ts";

async function withDb(run: (db: DatabaseSync) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-conversations-stale-h-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const URL_BASE = "http://localhost/api/conversations";
const msg = (id: number) => ({
  id,
  role: id % 2 ? "user" : "assistant",
  text: `m${id}`,
  language: "en",
});
const get = (db: DatabaseSync, query: string) =>
  handleGetConversations(new Request(`${URL_BASE}${query}`), db);
const put = (db: DatabaseSync, query: string, body: unknown) =>
  handlePutConversation(
    new Request(`${URL_BASE}${query}`, {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    db,
  );

async function seed(db: DatabaseSync): Promise<number> {
  const response = await put(db, "?botId=a", { messages: [msg(1)] });
  return (await response.json()).updatedAt;
}

test("a stale baseUpdatedAt answers 409 with the server value and writes nothing", async () => {
  await withDb(async (db) => {
    const at = await seed(db);
    const response = await put(db, "?botId=a", {
      messages: [msg(1), msg(2)],
      baseUpdatedAt: at - 1,
    });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "stale", updatedAt: at });
    assert.equal((await get(db, "?botId=a").json()).messages.length, 1);
  });
});

test("a current baseUpdatedAt writes with 200", async () => {
  await withDb(async (db) => {
    const at = await seed(db);
    const response = await put(db, "?botId=a", {
      messages: [msg(1), msg(2)],
      baseUpdatedAt: at,
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).count, 2);
  });
});

test("a null baseUpdatedAt expects no row", async () => {
  await withDb(async (db) => {
    const created = await put(db, "?botId=a", {
      messages: [msg(1)],
      baseUpdatedAt: null,
    });
    assert.equal(created.status, 200);
    const again = await put(db, "?botId=a", {
      messages: [msg(2)],
      baseUpdatedAt: null,
    });
    assert.equal(again.status, 409);
    const missing = await put(db, "?botId=b", {
      messages: [msg(1)],
      baseUpdatedAt: 5,
    });
    assert.equal(missing.status, 409);
    assert.deepEqual(await missing.json(), { error: "stale", updatedAt: null });
  });
});

test("a baseUpdatedAt of the wrong type is a 400", async () => {
  await withDb(async (db) => {
    for (const raw of ['"1"', "true", "{}", "[]", "1e999"]) {
      const response = await put(
        db,
        "?botId=a",
        `{"messages":[],"baseUpdatedAt":${raw}}`,
      );
      assert.equal(response.status, 400, raw);
      assert.equal((await response.json()).error, "invalid_base_updated_at");
    }
  });
});

test("a PUT without baseUpdatedAt overwrites as before", async () => {
  await withDb(async (db) => {
    await seed(db);
    const response = await put(db, "?botId=a", { messages: [msg(2)] });
    assert.equal(response.status, 200);
  });
});

test("baseUpdatedAt is checked per thread", async () => {
  await withDb(async (db) => {
    const at = await seed(db);
    const other = await put(db, "?botId=a&threadId=t2", {
      messages: [msg(1)],
      baseUpdatedAt: at,
    });
    assert.equal(other.status, 409);
    assert.deepEqual(await other.json(), { error: "stale", updatedAt: null });
    const created = await put(db, "?botId=a&threadId=t2", {
      messages: [msg(1)],
      baseUpdatedAt: null,
    });
    assert.equal(created.status, 200);
    const main = await put(db, "?botId=a", {
      messages: [msg(2)],
      baseUpdatedAt: at,
    });
    assert.equal(main.status, 200);
  });
});
