import assert from "node:assert/strict";
import test from "node:test";

import {
  ATTENTION_MAX,
  ATTENTION_MAX_BOTS,
  addAttention,
  clearAttention,
  sanitizeAttention,
  shouldCountReply,
  totalAttention,
} from "./attention-counts.ts";

test("a reply counts when another bot is open or the tab is hidden", () => {
  assert.equal(shouldCountReply("dev", "chief", true), true);
  assert.equal(shouldCountReply("dev", "dev", false), true);
  assert.equal(shouldCountReply("dev", "chief", false), true);
});

test("a reply to the bot being looked at does not count", () => {
  assert.equal(shouldCountReply("dev", "dev", true), false);
});

test("replies add up per bot without touching the others", () => {
  const once = addAttention({}, "dev");
  const twice = addAttention(once, "dev");
  assert.deepEqual(addAttention(twice, "chief"), { dev: 2, chief: 1 });
  assert.deepEqual(once, { dev: 1 });
});

test("a count stops at the cap", () => {
  const full = addAttention({ dev: ATTENTION_MAX }, "dev");
  assert.equal(full.dev, ATTENTION_MAX);
});

test("opening a bot clears only its count", () => {
  assert.deepEqual(clearAttention({ dev: 3, chief: 1 }, "dev"), { chief: 1 });
});

test("clearing a bot without a count returns the same object", () => {
  const counts = { chief: 1 };
  assert.equal(clearAttention(counts, "dev"), counts);
});

test("the total ignores bots that no longer exist", () => {
  const counts = { dev: 2, chief: 1, gone: 7 };
  assert.equal(totalAttention(counts, ["dev", "chief"]), 3);
  assert.equal(totalAttention(counts, []), 0);
});

test("stored counts are read back as whole numbers in range", () => {
  assert.deepEqual(
    sanitizeAttention({ a: 2.9, b: 500, c: 0, d: -1, e: "3", f: null, g: NaN }),
    { a: 2, b: ATTENTION_MAX },
  );
});

test("stored data that is not a map of counts reads as empty", () => {
  for (const raw of [null, undefined, 4, "x", [1, 2], true]) {
    assert.deepEqual(sanitizeAttention(raw), {});
  }
});

test("stored ids of the wrong size are dropped", () => {
  assert.deepEqual(sanitizeAttention({ "": 1, ["x".repeat(101)]: 1, ok: 1 }), {
    ok: 1,
  });
});

test("a stored map is cut to the entries the app can have", () => {
  const raw = Object.fromEntries(
    Array.from({ length: ATTENTION_MAX_BOTS + 50 }, (_, i) => [`b${i}`, 1]),
  );
  assert.equal(Object.keys(sanitizeAttention(raw)).length, ATTENTION_MAX_BOTS);
});

test("a stored __proto__ key stays data and does not reach the prototype", () => {
  const parsed: unknown = JSON.parse('{"__proto__": 5, "dev": 1}');
  const clean = sanitizeAttention(parsed);
  assert.equal(Object.getPrototypeOf(clean), Object.prototype);
  assert.equal(({} as Record<string, unknown>).x, undefined);
  assert.equal(clean.dev, 1);
});
