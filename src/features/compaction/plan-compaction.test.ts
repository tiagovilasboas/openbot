import assert from "node:assert/strict";
import test from "node:test";
import { applyCompaction } from "./apply-compaction.ts";
import { planCompaction } from "./plan-compaction.ts";
import { FULL, msg, ROOMY, thread } from "./thread-fixtures.ts";

test("no plan while the window has room", () => {
  assert.equal(planCompaction(thread(10), ROOMY), null);
});

test("no plan with six messages or fewer", () => {
  assert.equal(planCompaction(thread(3), FULL), null);
  assert.equal(planCompaction(thread(2), FULL), null);
});

test("splits the older turns from the last six messages", () => {
  const plan = planCompaction(thread(5), FULL);
  assert.ok(plan);
  assert.deepEqual(
    plan.older.map((m) => m.id),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    plan.recent.map((m) => m.id),
    [5, 6, 7, 8, 9, 10],
  );
  assert.equal(plan.previous, null);
});

test("the recent part opens on a user message, never mid-exchange", () => {
  // Nine messages: a cut leaving six would land on a reply, so it moves back.
  const messages = [
    ...thread(3),
    msg(7, "user"),
    msg(8, "assistant"),
    msg(9, "assistant"),
  ];
  const plan = planCompaction(messages, FULL);
  assert.ok(plan);
  assert.equal(plan.recent[0].role, "user");
  assert.deepEqual(
    plan.older.map((m) => m.id),
    [1, 2],
  );
});

test("a broken-off reply stays beside its user message", () => {
  const messages = thread(5);
  messages[3] = msg(4, "assistant", "partial", { incomplete: "cancelled" });
  const plan = planCompaction(messages, FULL);
  assert.ok(plan);
  // The exchange 3-4 is kept, so it can still be retried.
  assert.deepEqual(
    plan.older.map((m) => m.id),
    [1, 2],
  );
  assert.ok(plan.recent.some((m) => m.id === 4));
});

test("a team room in the old part is never compacted", () => {
  const messages = thread(5);
  messages[1] = msg(2, "assistant", "step", {
    crewStep: { task: "t" } as never,
  });
  assert.equal(planCompaction(messages, FULL), null);
});

test("an existing marker is folded in; only the messages after it count", () => {
  const first = planCompaction(thread(5), FULL);
  assert.ok(first);
  const compacted = applyCompaction(
    thread(5),
    first,
    "summary one",
    new Date(0),
  );
  assert.equal(compacted.length, 7);
  // Six messages after the marker: not enough to fold.
  assert.equal(planCompaction(compacted, FULL), null);
  const longer = [...compacted, msg(11, "user"), msg(12, "assistant")];
  const plan = planCompaction(longer, FULL);
  assert.ok(plan);
  assert.equal(plan.previous?.id, 1);
  assert.equal(plan.older.length, 2);
});
