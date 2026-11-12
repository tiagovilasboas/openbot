import assert from "node:assert/strict";
import test from "node:test";
import { applyCompaction } from "./apply-compaction.ts";
import { ARCHIVED_MAX, SUMMARY_MAX_CHARS } from "./compaction-types.ts";
import { planCompaction } from "./plan-compaction.ts";
import { FULL, msg, thread } from "./thread-fixtures.ts";

const NOW = new Date("2026-11-01T10:00:00.000Z");

test("one marker with the summary, then the recent messages untouched", () => {
  const messages = thread(5);
  const plan = planCompaction(messages, FULL);
  assert.ok(plan);
  const next = applyCompaction(messages, plan, "  the gist  ", NOW);
  assert.equal(next.length, 1 + plan.recent.length);
  assert.equal(next[0].text, "the gist");
  assert.equal(next[0].role, "assistant");
  assert.equal(next[0].compacted?.originalCount, 4);
  assert.equal(next[0].compacted?.compactedAt, NOW.toISOString());
  assert.deepEqual(next.slice(1), plan.recent);
});

test("the replaced messages are archived whole, not lost", () => {
  const messages = thread(5);
  const plan = planCompaction(messages, FULL);
  assert.ok(plan);
  const next = applyCompaction(messages, plan, "s", NOW);
  assert.deepEqual(next[0].compacted?.archived, messages.slice(0, 4));
});

test("messages queued after the recent part survive", () => {
  const messages = [...thread(5), msg(11, "user", "queued")];
  const plan = planCompaction(messages.slice(0, 10), FULL);
  assert.ok(plan);
  const next = applyCompaction(messages, plan, "s", NOW);
  assert.equal(next.at(-1)?.text, "queued");
});

test("the marker keeps the id of the first replaced message", () => {
  const messages = thread(5);
  const plan = planCompaction(messages, FULL);
  assert.ok(plan);
  assert.equal(applyCompaction(messages, plan, "s", NOW)[0].id, 1);
});

test("a second compaction folds the first: counts add up, archive is flat", () => {
  const messages = thread(5);
  const first = planCompaction(messages, FULL);
  assert.ok(first);
  const once = [
    ...applyCompaction(messages, first, "one", NOW),
    msg(11, "user"),
    msg(12, "assistant"),
  ];
  const second = planCompaction(once, FULL);
  assert.ok(second);
  const twice = applyCompaction(once, second, "two", NOW);
  assert.equal(twice[0].text, "two");
  assert.equal(twice[0].compacted?.originalCount, 6);
  assert.equal(twice[0].compacted?.archived.length, 6);
  assert.ok(twice[0].compacted?.archived.every((m) => !m.compacted));
});

test("an over-long summary is cut and a huge archive keeps the newest", () => {
  const messages = thread(5);
  const plan = planCompaction(messages, FULL);
  assert.ok(plan);
  const next = applyCompaction(messages, plan, "x".repeat(10_000), NOW);
  assert.equal(next[0].text.length, SUMMARY_MAX_CHARS);

  const many = Array.from({ length: ARCHIVED_MAX + 50 }, (_, i) =>
    msg(i + 1, i % 2 === 0 ? "user" : "assistant"),
  );
  const big = [...many, ...thread(4).map((m) => ({ ...m, id: m.id + 1000 }))];
  const bigPlan = planCompaction(big, FULL);
  assert.ok(bigPlan);
  const folded = applyCompaction(big, bigPlan, "s", NOW);
  assert.equal(folded[0].compacted?.archived.length, ARCHIVED_MAX);
  assert.equal(folded[0].compacted?.originalCount, bigPlan.older.length);
});
