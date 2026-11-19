import assert from "node:assert/strict";
import { test } from "node:test";
import { routineThreadId, runsToMessages } from "./routine-thread.ts";
import type { RoutineRun } from "./routines-api.ts";

const run = (id: number, extra: Partial<RoutineRun> = {}): RoutineRun => ({
  id,
  origin: "schedule",
  startedAt: id,
  finishedAt: id * 10,
  status: "succeeded",
  reason: null,
  nothingNew: false,
  output: `out ${id}`,
  ...extra,
});

test("the thread id is stable and fits a thread id", () => {
  assert.equal(routineThreadId("r_abc"), "routine-r_abc");
  const long = routineThreadId("x".repeat(64));
  assert.ok(/^[A-Za-z0-9_-]{1,40}$/.test(long));
  assert.equal(long, routineThreadId("x".repeat(64)));
  assert.notEqual(long, routineThreadId("x".repeat(63) + "y"));
});

test("new runs become assistant messages, oldest first", () => {
  const r = runsToMessages([run(2), run(1)], [], new Set(), "en");
  assert.deepEqual(
    r.messages.map((m) => [m.id, m.role, m.text]),
    [
      [1, "assistant", "out 1"],
      [2, "assistant", "out 2"],
    ],
  );
  assert.deepEqual(r.handledRunIds, [1, 2]);
});

test("handled runs are not added twice", () => {
  const r = runsToMessages([run(1), run(2)], [], new Set([1]), "en");
  assert.deepEqual(
    r.messages.map((m) => m.text),
    ["out 2"],
  );
});

test("silent, empty, failed and unfinished runs add nothing", () => {
  const r = runsToMessages(
    [
      run(1, { nothingNew: true }),
      run(2, { output: null }),
      run(3, { status: "failed" }),
      run(4, { finishedAt: null, status: "running" }),
    ],
    [],
    new Set(),
    "en",
  );
  assert.deepEqual(r.messages, []);
  assert.deepEqual(r.handledRunIds, [1, 2, 3]);
});

test("ids continue after the thread's own messages", () => {
  const existing = [{ id: 7, language: "en", role: "user", text: "hi" }];
  const r = runsToMessages([run(1)], existing as never, new Set(), "en");
  assert.equal(r.messages[0].id, 8);
});
