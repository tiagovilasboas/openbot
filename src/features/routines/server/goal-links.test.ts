import assert from "node:assert/strict";
import { test } from "node:test";
import type { BotGoal } from "../../bots/bot-goal.ts";
import { migrate } from "../../../shared/local-store/migrate.ts";
import { dropEndedGoalLinks } from "./goal-links.ts";
import { handleSaveRoutine } from "./routines-handler.ts";
import {
  getRoutine,
  listRoutines,
  saveRoutine,
} from "./routines-repository.ts";
import { ROUTINES_MIGRATIONS } from "./routines-schema.ts";
import { routine, withDb } from "./routines-test-db.ts";

const T0 = Date.parse("2026-11-01T10:00:00Z");
const goal = (status: BotGoal["status"]): BotGoal => ({
  title: "Ship the report",
  status,
  updatedAt: "2026-11-20T10:00:00.000Z",
});

test("a routine saved before the goal link existed upgrades unlinked and keeps working", () =>
  withDb((db) => {
    // The schema as it was before the goal link: all steps but the last.
    migrate(db, "routines", ROUTINES_MIGRATIONS.slice(0, -1));
    db.prepare(
      `INSERT INTO routines (id, bot_id, enabled, running_since, next_run_at, last_run_at, data, updated_at)
       VALUES ('r1', 'bot-a', 1, NULL, ?, NULL, ?, ?)`,
    ).run(T0, JSON.stringify(routine()), T0);
    const old = getRoutine(db, "r1")!;
    assert.equal(old.enabled, true);
    assert.equal("goalLinked" in old, false);
    // Running the upgrade again is harmless.
    assert.equal(listRoutines(db).length, 1);
    saveRoutine(db, routine({ goalLinked: true }), T0);
    assert.equal(getRoutine(db, "r1")!.goalLinked, true);
  }));

test("the link survives a save, an edit and a pause toggle", () =>
  withDb((db) => {
    saveRoutine(db, routine({ goalLinked: true }), T0);
    assert.equal(getRoutine(db, "r1")!.goalLinked, true);
    saveRoutine(db, { ...routine({ goalLinked: true }), enabled: false }, T0);
    assert.equal(getRoutine(db, "r1")!.goalLinked, true);
    saveRoutine(db, routine(), T0);
    assert.equal("goalLinked" in getRoutine(db, "r1")!, false);
  }));

test("a finished or cleared goal cuts the link and keeps the routine running", () =>
  withDb((db) => {
    for (const id of ["r1", "r2", "r3", "r4"]) {
      saveRoutine(
        db,
        routine({ id, botId: `bot-${id}`, goalLinked: true }),
        T0,
      );
    }
    dropEndedGoalLinks(db, [
      { id: "bot-r1", goal: goal("done") },
      { id: "bot-r2" },
      { id: "bot-r3", goal: goal("paused") },
      { id: "bot-r4", goal: goal("active") },
    ]);
    for (const id of ["r1", "r2"]) {
      const stored = getRoutine(db, id)!;
      assert.equal(stored.goalLinked, undefined);
      assert.equal(stored.enabled, true);
      assert.ok(stored.nextRunAt !== null);
      assert.equal(stored.idlePausedAt, null);
    }
    assert.equal(getRoutine(db, "r3")!.goalLinked, true);
    assert.equal(getRoutine(db, "r4")!.goalLinked, true);
  }));

const put = (body: unknown) =>
  new Request("http://127.0.0.1/api/routines", {
    method: "PUT",
    body: JSON.stringify(body),
  });
const bots = (botId: string) => botId === "bot-a";

test("saving a link needs an active goal; without one it is dropped", () =>
  withDb(async (db) => {
    const withGoal = await handleSaveRoutine(
      put(routine({ goalLinked: true })),
      db,
      bots,
      () => T0,
      () => true,
    );
    assert.equal(withGoal.status, 200);
    assert.equal(getRoutine(db, "r1")!.goalLinked, true);
    const without = await handleSaveRoutine(
      put(routine({ goalLinked: true })),
      db,
      bots,
      () => T0,
      () => false,
    );
    assert.equal(without.status, 200);
    assert.equal(getRoutine(db, "r1")!.goalLinked, undefined);
  }));
