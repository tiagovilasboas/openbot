import assert from "node:assert/strict";
import test from "node:test";

import { dropIndexAt, reorderBots } from "./reorder-bots.ts";

const bots = (...ids: string[]) => ids.map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((b) => b.id);

test("moves a bot down and up inside the list", () => {
  const list = bots("main", "a", "b", "c");
  assert.deepEqual(ids(reorderBots(list, "a", 3, "main")), [
    "main",
    "b",
    "c",
    "a",
  ]);
  assert.deepEqual(ids(reorderBots(list, "c", 1, "main")), [
    "main",
    "c",
    "a",
    "b",
  ]);
});

test("the main bot cannot be moved", () => {
  const list = bots("main", "a", "b");
  assert.equal(reorderBots(list, "main", 2, "main"), list);
});

test("nothing goes above the main bot", () => {
  const list = bots("main", "a", "b");
  assert.deepEqual(ids(reorderBots(list, "b", 0, "main")), ["main", "b", "a"]);
  assert.deepEqual(ids(reorderBots(list, "b", -5, "main")), ["main", "b", "a"]);
});

test("a main bot stored out of place is put on top while reordering", () => {
  const list = bots("a", "main", "b", "c");
  assert.deepEqual(ids(reorderBots(list, "c", 1, "main")), [
    "main",
    "c",
    "a",
    "b",
  ]);
});

test("the target is clamped to the end of the list", () => {
  const list = bots("main", "a", "b");
  assert.deepEqual(ids(reorderBots(list, "a", 99, "main")), ["main", "b", "a"]);
});

test("an unknown id or a move in place returns the same list", () => {
  const list = bots("main", "a", "b");
  assert.equal(reorderBots(list, "ghost", 1, "main"), list);
  assert.equal(reorderBots(list, "a", 1, "main"), list);
  assert.equal(reorderBots(list, "a", Number.NaN, "main"), list);
});

test("without a main bot every position is free", () => {
  const list = bots("a", "b", "c");
  assert.deepEqual(ids(reorderBots(list, "c", 0, undefined)), ["c", "a", "b"]);
  assert.deepEqual(ids(reorderBots(list, "c", 0, "gone")), ["c", "a", "b"]);
});

test("does not mutate its input", () => {
  const list = bots("main", "a", "b");
  reorderBots(list, "b", 1, "main");
  assert.deepEqual(ids(list), ["main", "a", "b"]);
});

test("dropIndexAt counts the rows above the pointer", () => {
  const centres = [20, 60, 100];
  assert.equal(dropIndexAt(centres, 0), 0);
  assert.equal(dropIndexAt(centres, 61), 2);
  assert.equal(dropIndexAt(centres, 500), 3);
  assert.equal(dropIndexAt([], 10), 0);
});
