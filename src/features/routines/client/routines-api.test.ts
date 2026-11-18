import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRun, parseSavedRoutine } from "./routines-api.ts";

const routine = {
  id: "r_1",
  botId: "bot_1",
  title: "Resumo",
  prompt: "Faça um resumo",
  schedule: { kind: "interval", everyMinutes: 60 },
  enabled: true,
  silentWhenNothingNew: false,
  runningSince: null,
  nextRunAt: 1_700_000_000_000,
  lastRunAt: "not a number",
};

test("a server routine keeps its timing; bad numbers become null", () => {
  const parsed = parseSavedRoutine(routine);
  assert.ok(parsed);
  assert.equal(parsed.nextRunAt, 1_700_000_000_000);
  assert.equal(parsed.lastRunAt, null);
  assert.equal(parsed.runningSince, null);
});

test("a routine that fails the input check is dropped", () => {
  assert.equal(parseSavedRoutine({ ...routine, id: "bad id!" }), null);
  assert.equal(parseSavedRoutine(null), null);
  assert.equal(
    parseSavedRoutine({ ...routine, schedule: { kind: "hourly" } }),
    null,
  );
});

test("a run record is read field by field", () => {
  assert.deepEqual(
    parseRun({
      id: 3,
      routineId: "r_1",
      origin: "manual",
      startedAt: 10,
      finishedAt: 20,
      status: "succeeded",
      reason: null,
      nothingNew: true,
      output: null,
    }),
    {
      id: 3,
      origin: "manual",
      startedAt: 10,
      finishedAt: 20,
      status: "succeeded",
      reason: null,
      nothingNew: true,
      output: null,
    },
  );
});

test("a malformed run is dropped and unknown origins read as schedule", () => {
  assert.equal(parseRun({ id: 1, startedAt: 1, status: "weird" }), null);
  assert.equal(parseRun({ id: "1", startedAt: 1, status: "failed" }), null);
  assert.equal(parseRun("x"), null);
  const run = parseRun({ id: 1, startedAt: 1, status: "failed", origin: "?" });
  assert.equal(run?.origin, "schedule");
  assert.equal(run?.finishedAt, null);
});
