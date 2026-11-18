import assert from "node:assert/strict";
import { test } from "node:test";
import { forgetBotRoutines, listRoutines } from "./routines-repository.ts";
import {
  handleDeleteRoutine,
  handleListRoutines,
  handleListRuns,
  handleRunNow,
  handleSaveRoutine,
} from "./routines-handler.ts";
import { routine, withDb } from "./routines-test-db.ts";

const base = "http://127.0.0.1/api/routines";
const put = (body: unknown) =>
  new Request(base, { method: "PUT", body: JSON.stringify(body) });
const onlyBotA = (botId: string) => botId === "bot-a";

test("PUT saves a valid routine and GET lists it", () =>
  withDb(async (db) => {
    const saved = await handleSaveRoutine(
      put(routine()),
      db,
      onlyBotA,
      () => 0,
    );
    assert.equal(saved.status, 200);
    const listed = await handleListRoutines(
      new Request(`${base}?botId=bot-a`),
      db,
    ).json();
    assert.equal(listed.routines.length, 1);
    assert.equal(listed.routines[0].title, "Resumo");
  }));

test("PUT refuses a bad body, a bad schedule and an unknown bot", () =>
  withDb(async (db) => {
    assert.equal(
      (
        await handleSaveRoutine(
          new Request(base, { method: "PUT", body: "{" }),
          db,
          onlyBotA,
        )
      ).status,
      400,
    );
    const badSchedule = await handleSaveRoutine(
      put(routine({ schedule: { kind: "interval", everyMinutes: 1 } })),
      db,
      onlyBotA,
    );
    assert.deepEqual(await badSchedule.json(), { error: "invalid_schedule" });
    assert.equal(
      (await handleSaveRoutine(put(routine({ botId: "bot-x" })), db, onlyBotA))
        .status,
      404,
    );
  }));

test("run now records a manual run that is never silent", () =>
  withDb(async (db) => {
    await handleSaveRoutine(
      put(routine({ silentWhenNothingNew: true })),
      db,
      onlyBotA,
    );
    const response = await handleRunNow(
      new Request(`${base}/run?id=r1`, { method: "POST" }),
      db,
      async () => ({ kind: "replied", text: "[[no-update]]" }),
    );
    assert.equal(response.status, 200);
    const runs = await handleListRuns(
      new Request(`${base}/runs?id=r1`),
      db,
    ).json();
    assert.equal(runs.runs[0].origin, "manual");
    assert.equal(runs.runs[0].nothingNew, false);
    assert.equal(runs.runs[0].output, "[[no-update]]");
  }));

test("run now and runs answer 404 for an unknown routine and 400 for a bad id", () =>
  withDb(async (db) => {
    const runner = async () => ({ kind: "replied" as const, text: "x" });
    assert.equal(
      (await handleRunNow(new Request(`${base}/run?id=nope`), db, runner))
        .status,
      404,
    );
    assert.equal(
      (await handleRunNow(new Request(`${base}/run?id=../x`), db, runner))
        .status,
      400,
    );
    assert.equal(handleListRuns(new Request(`${base}/runs`), db).status, 400);
  }));

test("DELETE removes a routine; removing its bot removes it too", () =>
  withDb(async (db) => {
    await handleSaveRoutine(put(routine()), db, onlyBotA);
    await handleSaveRoutine(put(routine({ id: "r2" })), db, onlyBotA);
    assert.equal(
      handleDeleteRoutine(new Request(`${base}?id=r1`), db).status,
      200,
    );
    assert.equal(
      handleDeleteRoutine(new Request(`${base}?id=r1`), db).status,
      404,
    );
    forgetBotRoutines(db, ["bot-a"]);
    assert.equal(listRoutines(db).length, 0);
  }));
