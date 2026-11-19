import assert from "node:assert/strict";
import test from "node:test";
import { newThread, defaultThread } from "../threads/thread-model.ts";
import { ageBucket, buildTaskRows } from "./task-rows.ts";

const a = { id: "a", name: "Alpha" };
const b = { id: "b", name: "Beta" };

test("lists every thread of every bot, most recent first", () => {
  const rows = buildTaskRows(
    [
      {
        bot: a,
        threads: [defaultThread("a"), newThread("a", "t1", 100)],
        selectedThreadId: "default",
      },
      {
        bot: b,
        threads: [defaultThread("b"), newThread("b", "t2", 300)],
        selectedThreadId: "default",
      },
    ],
    [],
  );
  assert.deepEqual(
    rows.map((r) => r.key),
    ["b/t2", "a/t1", "a/default", "b/default"],
  );
});

test("marks only the selected thread of a working bot, and lists it first", () => {
  const rows = buildTaskRows(
    [
      {
        bot: a,
        threads: [defaultThread("a"), newThread("a", "t1", 100)],
        selectedThreadId: "default",
      },
      {
        bot: b,
        threads: [newThread("b", "t2", 300)],
        selectedThreadId: "t2",
      },
    ],
    ["a"],
  );
  assert.equal(rows[0].key, "a/default");
  assert.deepEqual(
    rows.filter((r) => r.running).map((r) => r.key),
    ["a/default"],
  );
});

test("age buckets", () => {
  const now = 10_000_000;
  assert.equal(ageBucket(0, now), null);
  assert.deepEqual(ageBucket(now - 30_000, now), { unit: "now", value: 0 });
  assert.deepEqual(ageBucket(now - 5 * 60_000, now), {
    unit: "minutes",
    value: 5,
  });
  assert.deepEqual(ageBucket(now - 3 * 3_600_000, now), {
    unit: "hours",
    value: 3,
  });
  assert.deepEqual(ageBucket(now - 2 * 86_400_000, now), {
    unit: "days",
    value: 2,
  });
});
