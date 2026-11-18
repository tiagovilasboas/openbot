import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { handleGetLevels, handlePutLevel } from "./levels-handler.ts";
import { listToolLevels } from "./levels-repository.ts";
import { fakeTools, withDb } from "./tool-turn-fixtures.ts";

const { registry } = fakeTools();

const put = (db: DatabaseSync, body: unknown) =>
  handlePutLevel(
    new Request("http://localhost/api/tools/levels", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    db,
    registry,
  );

test("GET lists every tool as ask with whether allow is permitted", async () => {
  await withDb(async (db) => {
    const response = handleGetLevels(db, registry);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), {
      tools: [
        { name: "lookup", level: "ask", canAllow: false, canAsk: true },
        { name: "note", level: "ask", canAllow: true, canAsk: true },
      ],
    });
  });
});

test("PUT sets a level and answers the fresh list", async () => {
  await withDb(async (db) => {
    const response = await put(db, { toolName: "note", level: "allow" });
    assert.equal(response.status, 200);
    assert.deepEqual(listToolLevels(db), { note: "allow" });
    const body = (await response.json()) as { tools: { level: string }[] };
    assert.deepEqual(
      body.tools.map((tool) => tool.level),
      ["ask", "allow"],
    );
    await put(db, { toolName: "note", level: "ask" });
    assert.deepEqual(listToolLevels(db), {});
  });
});

test("PUT may block any tool", async () => {
  await withDb(async (db) => {
    assert.equal(
      (await put(db, { toolName: "lookup", level: "block" })).status,
      200,
    );
    assert.deepEqual(listToolLevels(db), { lookup: "block" });
  });
});

test("PUT refuses allow for a tool without allowAlways", async () => {
  await withDb(async (db) => {
    const response = await put(db, { toolName: "lookup", level: "allow" });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "allow_not_permitted" });
    assert.deepEqual(listToolLevels(db), {});
  });
});

test("PUT refuses a tool that is not in the registry", async () => {
  await withDb(async (db) => {
    const response = await put(db, { toolName: "nope", level: "block" });
    assert.equal(response.status, 404);
    assert.deepEqual(listToolLevels(db), {});
  });
});

test("PUT refuses a bad body or an unknown level", async () => {
  await withDb(async (db) => {
    for (const body of [
      "not json",
      "[]",
      {},
      { toolName: "note" },
      { toolName: "note", level: "never" },
      { toolName: 7, level: "block" },
    ]) {
      assert.equal((await put(db, body)).status, 400, JSON.stringify(body));
    }
    assert.deepEqual(listToolLevels(db), {});
  });
});

test("PUT refuses a body over the cap", async () => {
  await withDb(async (db) => {
    const response = await put(db, "x".repeat(70 * 1024));
    assert.equal(response.status, 413);
  });
});
