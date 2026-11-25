import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_BOT } from "../../bots/bot-types.ts";
import { replaceBots } from "../../bots/server/bots-repository.ts";
import {
  claimDueRoutines,
  finishRun,
  startRun,
} from "../../routines/server/routine-runs-repository.ts";
import {
  listRoutines,
  saveRoutine,
} from "../../routines/server/routines-repository.ts";
import { routine, withDb } from "../../routines/server/routines-test-db.ts";
import { createMessageBotTool } from "./message-bot-tool.ts";
import { pruneFinishedHandoffs } from "./prune-handoffs.ts";

const T0 = 1_700_000_000_000;
const HOUR = 3_600_000;
const A = { ...DEFAULT_BOT, id: "bot_a", name: "Ana" };
const B = { ...DEFAULT_BOT, id: "bot_b", name: "Beto" };

type Db = Parameters<typeof saveRoutine>[0];

function fire(db: Db, id: string, at: number) {
  claimDueRoutines(db, at);
  const run = startRun(db, id, "schedule", at);
  const end = { status: "succeeded", nothingNew: false, output: "ok" } as const;
  finishRun(db, run, id, end, at);
}

test("a fired handoff is removed after an hour, nothing else is", async () => {
  await withDb(async (db) => {
    const once = { kind: "once", at: T0 + 1_000 } as const;
    for (const id of ["m_old", "m_pending", "w_wake", "mine"]) {
      saveRoutine(db, routine({ id, botId: "bot_b", schedule: once }), T0);
    }
    // m_pending is still waiting: only the three below ran.
    for (const id of ["m_old", "w_wake", "mine"]) fire(db, id, T0 + 1_000);
    assert.equal(pruneFinishedHandoffs(db, T0 + HOUR - 1), 0);
    assert.equal(pruneFinishedHandoffs(db, T0 + 2 * HOUR), 1);
    const left = listRoutines(db)
      .map((r) => r.id)
      .sort();
    assert.deepEqual(left, ["m_pending", "mine", "w_wake"]);
  });
});

test("sending a new handoff cleans up the old, fired ones", async () => {
  await withDb(async (db) => {
    replaceBots(db, [A, B]);
    let now = T0;
    let n = 0;
    const tool = createMessageBotTool(
      db,
      () => now,
      () => `m_${++n}`,
    );
    const ctx = { botId: "bot_a", signal: new AbortController().signal };
    const first = await tool.run({ target: "Beto", text: "first topic" }, ctx);
    assert.ok(first.ok);
    fire(db, "m_1", T0 + 60_000);
    now = T0 + 2 * HOUR;
    const second = await tool.run(
      { target: "Beto", text: "second subject" },
      ctx,
    );
    assert.ok(second.ok);
    assert.deepEqual(
      listRoutines(db).map((r) => r.id),
      ["m_2"],
    );
  });
});
