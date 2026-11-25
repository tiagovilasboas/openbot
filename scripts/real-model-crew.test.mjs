// The crew cases against the scripted in-process transport: proves the
// scenario and the real handlers agree. It says nothing about any model.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CREW_PRESETS } from "../src/features/bots/crew-presets.ts";
import { buildCrewReport } from "./real-model-crew-report.mjs";
import { runCrewScenario } from "./real-model-crew-scenario.mjs";
import { createDryTransport } from "./real-model-crew-transports.mjs";

async function dryRows() {
  const transport = await createDryTransport([...CREW_PRESETS]);
  try {
    return await runCrewScenario(transport);
  } finally {
    transport.close();
  }
}

test("every crew case passes against the scripted handlers", async () => {
  const rows = await dryRows();
  assert.equal(rows.length, 5);
  for (const row of rows) {
    assert.equal(row.ok, true, `${row.name}: ${row.reason} ${row.detail}`);
  }
  assert.match(rows[0].detail, /1 of 3 members answered/);
  assert.match(rows[4].detail, /refused/);
});

test("a transport that never answers fails with a reason, not a throw", async () => {
  const silent = {
    seed: async () => true,
    post: async () => ({ status: 202, replies: [], timedOut: false }),
    toolTurn: async () => ({ status: 200, events: [], json: {} }),
    routines: async () => [],
    runRoutine: async () => ({ status: 404 }),
  };
  const rows = await runCrewScenario(silent);
  assert.deepEqual(
    rows.map((row) => row.reason),
    [
      "nobody_answered",
      "nobody_answered",
      "skipped:no_parent_message",
      "http_200",
      "skipped:no_first_handoff",
    ],
  );
});

test("the report is a markdown table without keys", async () => {
  const report = buildCrewReport(await dryRows(), {
    mode: "dry run",
    commit: "abc1234",
    node: "v24",
  });
  assert.match(report, /^# Real model run: crew cases/);
  assert.match(report, /Result: 5 of 5 cases passed/);
  assert.match(report, /\| @name picks the speaker \| ok \|/);
});
