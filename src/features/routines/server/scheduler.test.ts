import assert from "node:assert/strict";
import { test } from "node:test";
import { startRoutineScheduler } from "./scheduler.ts";

test("the scheduler can be turned off and starts only once per process", () => {
  const deps = {
    getDb: () => {
      throw new Error("not used");
    },
    makeRunner: () => async () => ({ kind: "replied" as const, text: "" }),
    intervalMs: 3_600_000,
  };
  assert.equal(startRoutineScheduler(deps, { OPENBOT_ROUTINES: "off" }), false);
  assert.equal(startRoutineScheduler(deps, {}), true);
  assert.equal(startRoutineScheduler(deps, {}), false);
});
