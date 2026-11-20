import assert from "node:assert/strict";
import test from "node:test";
import { listRuns, claimRoutine } from "./routine-runs-repository.ts";
import { saveRoutine } from "./routines-repository.ts";
import { routine, withDb } from "./routines-test-db.ts";
import { runClaimedRoutine, type RoutineRunner } from "./run-routines.ts";

const clock = () => 1_000_000;

test("a routine that reports something runs its followers with the result", async () => {
  await withDb(async (db) => {
    saveRoutine(db, routine({ id: "a" }), clock());
    saveRoutine(db, routine({ id: "b", afterRoutineId: "a" }), clock());
    saveRoutine(db, routine({ id: "c", afterRoutineId: "b" }), clock());
    const calls: [string, string | undefined][] = [];
    const runner: RoutineRunner = async (r, previous) => {
      calls.push([r.id, previous]);
      return { kind: "replied", text: `out-${r.id}` };
    };
    const claimed = claimRoutine(db, "a", clock())!;
    await runClaimedRoutine(db, claimed, "manual", runner, clock);
    assert.deepEqual(calls, [
      ["a", undefined],
      ["b", "out-a"],
      ["c", "out-b"],
    ]);
    assert.equal(listRuns(db, "b")[0].origin, "chain");
  });
});

test("a failed or silent run starts nothing", async () => {
  await withDb(async (db) => {
    saveRoutine(db, routine({ id: "a", silentWhenNothingNew: true }), clock());
    saveRoutine(db, routine({ id: "b", afterRoutineId: "a" }), clock());
    const seen: string[] = [];
    const quiet: RoutineRunner = async (r) => {
      seen.push(r.id);
      return { kind: "replied", text: "[[no-update]]" };
    };
    await runClaimedRoutine(
      db,
      claimRoutine(db, "a", clock())!,
      "schedule",
      quiet,
      clock,
    );
    const failing: RoutineRunner = async (r) => {
      seen.push(r.id);
      return { kind: "failed", reason: "x" };
    };
    await runClaimedRoutine(
      db,
      claimRoutine(db, "a", clock())!,
      "manual",
      failing,
      clock,
    );
    assert.deepEqual(seen, ["a", "a"]);
  });
});

test("a stored loop runs each routine once", async () => {
  await withDb(async (db) => {
    saveRoutine(db, routine({ id: "a", afterRoutineId: "b" }), clock());
    saveRoutine(db, routine({ id: "b", afterRoutineId: "a" }), clock());
    const seen: string[] = [];
    const runner: RoutineRunner = async (r) => {
      seen.push(r.id);
      return { kind: "replied", text: "news" };
    };
    await runClaimedRoutine(
      db,
      claimRoutine(db, "a", clock())!,
      "manual",
      runner,
      clock,
    );
    assert.deepEqual(seen, ["a", "b"]);
  });
});
