import assert from "node:assert/strict";
import { test } from "node:test";
import { IDLE_PAUSE_MS } from "../routine-idle.ts";
import { pauseIdleRoutines } from "./idle-pause.ts";
import { getRoutine, saveRoutine } from "./routines-repository.ts";
import { routine, withDb } from "./routines-test-db.ts";
import { runDueRoutines, type RoutineRunner } from "./run-routines.ts";

const T0 = Date.parse("2026-11-01T10:00:00Z");
const DAY = 24 * 60 * 60_000;
const never = () => null;
const replies: RoutineRunner = async () => ({ kind: "replied", text: "x" });

test("a recurring routine untouched for the idle window is paused, not run", () =>
  withDb(async (db) => {
    saveRoutine(db, routine(), T0);
    const now = T0 + IDLE_PAUSE_MS;
    assert.equal(await runDueRoutines(db, replies, () => now, never), 0);
    const stored = getRoutine(db, "r1")!;
    assert.equal(stored.enabled, false);
    assert.equal(stored.nextRunAt, null);
    assert.equal(stored.idlePausedAt, now);
  }));

test("a routine just inside the window still runs", () =>
  withDb(async (db) => {
    saveRoutine(db, routine(), T0);
    const now = T0 + IDLE_PAUSE_MS - 1;
    assert.equal(await runDueRoutines(db, replies, () => now, never), 1);
    assert.equal(getRoutine(db, "r1")!.enabled, true);
    assert.equal(getRoutine(db, "r1")!.idlePausedAt, null);
  }));

test("recent chat activity with the bot keeps its routines running", () =>
  withDb(async (db) => {
    saveRoutine(db, routine(), T0);
    saveRoutine(db, routine({ id: "r2", botId: "bot-b" }), T0);
    const now = T0 + 20 * DAY;
    const chat = (botId: string) => (botId === "bot-a" ? now - DAY : null);
    assert.equal(pauseIdleRoutines(db, now, chat), 1);
    assert.equal(getRoutine(db, "r1")!.enabled, true);
    assert.equal(getRoutine(db, "r2")!.enabled, false);
  }));

test("one-shot wake-ups and handoffs are never auto-paused", () =>
  withDb((db) => {
    const once = { kind: "once", at: T0 + 30 * DAY } as const;
    saveRoutine(db, routine({ id: "w_abc", schedule: once }), T0);
    saveRoutine(db, routine({ id: "m_abc", schedule: once }), T0);
    saveRoutine(db, routine({ id: "w_every" }), T0);
    assert.equal(pauseIdleRoutines(db, T0 + 40 * DAY, never), 0);
    for (const id of ["w_abc", "m_abc", "w_every"])
      assert.equal(getRoutine(db, id)!.enabled, true);
  }));

test("a routine mid-run is left alone and a disabled one is not marked", () =>
  withDb((db) => {
    saveRoutine(db, routine({ enabled: false }), T0);
    saveRoutine(db, routine({ id: "r2" }), T0);
    db.prepare("UPDATE routines SET running_since = ? WHERE id = 'r2'").run(
      T0 + DAY,
    );
    assert.equal(pauseIdleRoutines(db, T0 + 30 * DAY, never), 0);
    assert.equal(getRoutine(db, "r1")!.idlePausedAt, null);
    assert.equal(getRoutine(db, "r2")!.enabled, true);
  }));

test("resuming saves the routine again, clears the pause and restarts the clock", () =>
  withDb((db) => {
    saveRoutine(db, routine(), T0);
    const paused = T0 + 15 * DAY;
    pauseIdleRoutines(db, paused, never);
    assert.equal(getRoutine(db, "r1")!.enabled, false);
    saveRoutine(db, routine({ enabled: true }), paused);
    const resumed = getRoutine(db, "r1")!;
    assert.equal(resumed.enabled, true);
    assert.equal(resumed.idlePausedAt, null);
    assert.ok(resumed.nextRunAt! > paused);
    assert.equal(pauseIdleRoutines(db, paused + 13 * DAY, never), 0);
    assert.equal(pauseIdleRoutines(db, paused + 14 * DAY, never), 1);
  }));

test("a tick without an activity source never pauses", () =>
  withDb(async (db) => {
    saveRoutine(db, routine(), T0);
    await runDueRoutines(db, replies, () => T0 + 60 * DAY);
    assert.equal(getRoutine(db, "r1")!.enabled, true);
  }));
