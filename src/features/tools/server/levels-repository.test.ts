import assert from "node:assert/strict";
import test from "node:test";
import { listToolLevels, setToolLevel } from "./levels-repository.ts";
import { withDb } from "./tool-turn-fixtures.ts";

test("no row means no level, so every tool is ask", async () => {
  await withDb(async (db) => {
    assert.deepEqual(listToolLevels(db), {});
  });
});

test("a level is stored once per tool name and can change", async () => {
  await withDb(async (db) => {
    setToolLevel(db, "note", "allow", 1);
    setToolLevel(db, "lookup", "block", 2);
    assert.deepEqual(listToolLevels(db), { lookup: "block", note: "allow" });
    setToolLevel(db, "note", "block", 3);
    assert.deepEqual(listToolLevels(db), { lookup: "block", note: "block" });
  });
});

test("ask removes the row", async () => {
  await withDb(async (db) => {
    setToolLevel(db, "note", "block");
    setToolLevel(db, "note", "ask");
    assert.deepEqual(listToolLevels(db), {});
  });
});
