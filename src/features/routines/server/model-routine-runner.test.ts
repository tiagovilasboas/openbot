import assert from "node:assert/strict";
import { test } from "node:test";
import { createModelRoutineRunner } from "./model-routine-runner.ts";
import { getRoutine, saveRoutine } from "./routines-repository.ts";
import { routine, withDb } from "./routines-test-db.ts";

test("a routine whose bot is gone fails without calling a model", () =>
  withDb(async (db) => {
    saveRoutine(db, routine({ botId: "ghost" }), 0);
    const run = createModelRoutineRunner(db, {});
    assert.deepEqual(await run(getRoutine(db, "r1")!), {
      kind: "failed",
      reason: "bot_missing",
    });
  }));
