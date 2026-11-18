import assert from "node:assert/strict";
import { test } from "node:test";
import { isDue, nextRunState, type RoutineRunState } from "./routine-run.ts";

const idle: RoutineRunState = { status: "idle" };
const running: RoutineRunState = { status: "running", startedAt: "t0" };

test("a start on an enabled idle routine starts a run", () => {
  assert.deepEqual(
    nextRunState({ enabled: true, run: idle }, { type: "start", at: "t1" }),
    {
      status: "running",
      startedAt: "t1",
    },
  );
});

test("a start while running or disabled is skipped with the reason", () => {
  assert.deepEqual(
    nextRunState({ enabled: true, run: running }, { type: "start", at: "t1" }),
    {
      status: "skipped",
      at: "t1",
      reason: "already_running",
    },
  );
  assert.deepEqual(
    nextRunState({ enabled: false, run: idle }, { type: "start", at: "t1" }),
    {
      status: "skipped",
      at: "t1",
      reason: "disabled",
    },
  );
});

test("finish and fail close a running run", () => {
  assert.deepEqual(
    nextRunState(
      { enabled: true, run: running },
      { type: "finish", at: "t2", nothingNew: true },
    ),
    { status: "succeeded", finishedAt: "t2", nothingNew: true },
  );
  assert.deepEqual(
    nextRunState(
      { enabled: true, run: running },
      { type: "fail", at: "t2", reason: "rate_limit" },
    ),
    { status: "failed", finishedAt: "t2", reason: "rate_limit" },
  );
});

test("finish or fail without a run in flight changes nothing", () => {
  assert.equal(
    nextRunState(
      { enabled: true, run: idle },
      { type: "finish", at: "t2", nothingNew: false },
    ),
    idle,
  );
  assert.equal(
    nextRunState(
      { enabled: true, run: idle },
      { type: "fail", at: "t2", reason: "x" },
    ),
    idle,
  );
});

test("a routine is due when enabled, not running and past its next run", () => {
  const now = new Date("2026-11-18T10:00:00Z");
  const base = { enabled: true, run: idle, nextRunAt: "2026-11-18T10:00:00Z" };
  assert.equal(isDue(base, now), true);
  assert.equal(
    isDue({ ...base, nextRunAt: "2026-11-18T10:00:01Z" }, now),
    false,
  );
  assert.equal(isDue({ ...base, enabled: false }, now), false);
  assert.equal(isDue({ ...base, run: running }, now), false);
  assert.equal(isDue({ ...base, nextRunAt: undefined }, now), false);
});
