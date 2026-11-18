import assert from "node:assert/strict";
import { test } from "node:test";
import {
  claimDueRoutines,
  claimRoutine,
  listRuns,
} from "./routine-runs-repository.ts";
import { getRoutine, saveRoutine } from "./routines-repository.ts";
import { routine, withDb } from "./routines-test-db.ts";
import { runDueRoutines, type RoutineRunner } from "./run-routines.ts";

const T0 = Date.parse("2026-11-18T10:00:00Z");
const MIN = 60_000;
const replies =
  (text: string): RoutineRunner =>
  async () => ({ kind: "replied", text });

test("a saved routine is scheduled from the save time and not due before", () =>
  withDb(async (db) => {
    saveRoutine(db, routine(), T0);
    assert.equal(getRoutine(db, "r1")?.nextRunAt, T0 + 10 * MIN);
    assert.equal(await runDueRoutines(db, replies("x"), () => T0 + 9 * MIN), 0);
  }));

test("a due routine runs once, records its reply and reschedules from the finish", () =>
  withDb(async (db) => {
    saveRoutine(db, routine(), T0);
    const ran = await runDueRoutines(
      db,
      replies("2 PRs abertos"),
      () => T0 + 10 * MIN,
    );
    assert.equal(ran, 1);
    const [run] = listRuns(db, "r1");
    assert.equal(run.status, "succeeded");
    assert.equal(run.output, "2 PRs abertos");
    assert.equal(run.origin, "schedule");
    const stored = getRoutine(db, "r1")!;
    assert.equal(stored.runningSince, null);
    assert.equal(stored.lastRunAt, T0 + 10 * MIN);
    assert.equal(stored.nextRunAt, T0 + 20 * MIN);
  }));

test("a claimed routine is not claimed again by an overlapping tick", () =>
  withDb((db) => {
    saveRoutine(db, routine(), T0);
    assert.equal(claimDueRoutines(db, T0 + 10 * MIN).length, 1);
    assert.equal(claimDueRoutines(db, T0 + 11 * MIN).length, 0);
    assert.equal(claimRoutine(db, "r1", T0 + 11 * MIN), null);
  }));

test("a run lost by a crash is released after thirty minutes", () =>
  withDb((db) => {
    saveRoutine(db, routine(), T0);
    claimDueRoutines(db, T0 + 10 * MIN);
    assert.equal(claimDueRoutines(db, T0 + 41 * MIN).length, 1);
  }));

test("a disabled routine never runs on schedule", () =>
  withDb(async (db) => {
    saveRoutine(db, routine({ enabled: false }), T0);
    assert.equal(getRoutine(db, "r1")?.nextRunAt, null);
    assert.equal(
      await runDueRoutines(db, replies("x"), () => T0 + 99 * MIN),
      0,
    );
  }));

test("a failing or throwing runner leaves a failed run, never a stuck one", () =>
  withDb(async (db) => {
    saveRoutine(db, routine(), T0);
    await runDueRoutines(
      db,
      async () => ({ kind: "failed", reason: "rate_limit" }),
      () => T0 + 10 * MIN,
    );
    assert.equal(listRuns(db, "r1")[0].reason, "rate_limit");
    await runDueRoutines(
      db,
      async () => {
        throw new Error("boom");
      },
      () => T0 + 20 * MIN,
    );
    assert.equal(listRuns(db, "r1")[0].reason, "unexpected_error");
    assert.equal(getRoutine(db, "r1")?.runningSince, null);
  }));

test("a silent routine with nothing new keeps no output", () =>
  withDb(async (db) => {
    saveRoutine(db, routine({ silentWhenNothingNew: true }), T0);
    await runDueRoutines(db, replies("[[no-update]]"), () => T0 + 10 * MIN);
    const [run] = listRuns(db, "r1");
    assert.equal(run.nothingNew, true);
    assert.equal(run.output, null);
  }));

test("a changed schedule drops the old next run", () =>
  withDb((db) => {
    saveRoutine(db, routine(), T0);
    saveRoutine(
      db,
      routine({ schedule: { kind: "interval", everyMinutes: 60 } }),
      T0 + MIN,
    );
    assert.equal(getRoutine(db, "r1")?.nextRunAt, T0 + 61 * MIN);
  }));

test("a bot holds at most 64 routines", () =>
  withDb((db) => {
    for (let i = 0; i < 64; i += 1)
      saveRoutine(db, routine({ id: `r${i}` }), T0);
    assert.deepEqual(saveRoutine(db, routine({ id: "r64" }), T0), {
      ok: false,
      error: "too_many_routines",
    });
    assert.equal(
      saveRoutine(db, routine({ id: "r64", botId: "bot-b" }), T0).ok,
      true,
    );
  }));
