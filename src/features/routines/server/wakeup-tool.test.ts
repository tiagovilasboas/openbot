import assert from "node:assert/strict";
import test from "node:test";
import {
  claimDueRoutines,
  finishRun,
  startRun,
} from "./routine-runs-repository.ts";
import { getRoutine, saveRoutine } from "./routines-repository.ts";
import { routine, withDb } from "./routines-test-db.ts";
import { claimRoutine } from "./routine-runs-repository.ts";
import { runClaimedRoutine } from "./run-routines.ts";
import {
  createWakeupTool,
  MAX_PENDING_WAKEUPS,
  parseWakeupArgs,
} from "./wakeup-tool.ts";

const ctx = { botId: "bot-a", signal: new AbortController().signal };
const T0 = 1_700_000_000_000;

test("a wake-up needs a note and a time or a routine", () => {
  assert.equal(parseWakeupArgs({ note: "x" }).ok, false);
  assert.equal(parseWakeupArgs({ note: "x", inMinutes: 2 }).ok, false);
  assert.equal(parseWakeupArgs({ note: "x", inMinutes: 99_999 }).ok, false);
  assert.equal(parseWakeupArgs({ note: " ", inMinutes: 10 }).ok, false);
  assert.ok(parseWakeupArgs({ note: "x", inMinutes: 10 }).ok);
  assert.ok(parseWakeupArgs({ note: "x", afterRoutineId: "r1" }).ok);
});

test("a timed wake-up runs once at its time, then stays off", async () => {
  await withDb(async (db) => {
    let id = 0;
    const tool = createWakeupTool(
      db,
      () => T0,
      () => `w${++id}`,
    );
    const result = await tool.run(
      { note: "Check the deploy", inMinutes: 30 },
      ctx,
    );
    assert.ok(result.ok);
    const wake = getRoutine(db, "w1")!;
    assert.equal(wake.runInThread, true);
    assert.equal(wake.nextRunAt, T0 + 30 * 60_000);
    assert.deepEqual(claimDueRoutines(db, T0 + 29 * 60_000), []);
    const [due] = claimDueRoutines(db, T0 + 30 * 60_000);
    assert.equal(due.id, "w1");
    const run = startRun(db, "w1", "schedule", T0 + 30 * 60_000);
    finishRun(
      db,
      run,
      "w1",
      { status: "succeeded", nothingNew: false, output: "ok" },
      T0 + 31 * 60_000,
    );
    const done = getRoutine(db, "w1")!;
    assert.equal(done.enabled, false);
    assert.equal(done.nextRunAt, null);
    assert.deepEqual(claimDueRoutines(db, T0 + 10_000 * 60_000), []);
  });
});

test("a wake-up after a routine runs on that routine's report, once", async () => {
  await withDb(async (db) => {
    saveRoutine(db, routine({ id: "r1" }), T0);
    const tool = createWakeupTool(
      db,
      () => T0,
      () => "w1",
    );
    const result = await tool.run(
      { note: "Summarize it", afterRoutineId: "r1" },
      ctx,
    );
    assert.ok(result.ok);
    const seen: string[] = [];
    const runner = async (r: { id: string }) => {
      seen.push(r.id);
      return { kind: "replied" as const, text: "news" };
    };
    await runClaimedRoutine(
      db,
      claimRoutine(db, "r1", T0)!,
      "manual",
      runner,
      () => T0,
    );
    await runClaimedRoutine(
      db,
      claimRoutine(db, "r1", T0)!,
      "manual",
      runner,
      () => T0,
    );
    assert.deepEqual(seen, ["r1", "w1", "r1"]);
  });
});

test("another bot's routine and too many waits are refused", async () => {
  await withDb(async (db) => {
    saveRoutine(db, routine({ id: "other", botId: "bot-b" }), T0);
    let id = 0;
    const tool = createWakeupTool(
      db,
      () => T0,
      () => `w${++id}`,
    );
    assert.deepEqual(
      await tool.run({ note: "x", afterRoutineId: "other" }, ctx),
      { ok: false, code: "routine_not_found" },
    );
    for (let i = 0; i < MAX_PENDING_WAKEUPS; i += 1) {
      assert.ok((await tool.run({ note: `n${i}`, inMinutes: 10 }, ctx)).ok);
    }
    assert.deepEqual(await tool.run({ note: "one more", inMinutes: 10 }, ctx), {
      ok: false,
      code: "too_many_wakeups",
    });
  });
});
