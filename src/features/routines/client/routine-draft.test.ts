import assert from "node:assert/strict";
import { test } from "node:test";
import { isRoutineId } from "../routine-input.ts";
import {
  checkDraft,
  draftFromRoutine,
  emptyDraft,
  newRoutineId,
  toggleDay,
} from "./routine-draft.ts";

const draft = (patch = {}) => ({
  ...emptyDraft("America/Sao_Paulo", "r_1"),
  title: " Resumo ",
  prompt: " Faça um resumo ",
  ...patch,
});

test("a new id passes the server's id check", () => {
  for (let i = 0; i < 50; i += 1) assert.ok(isRoutineId(newRoutineId()));
  assert.ok(isRoutineId(newRoutineId(() => 0)));
});

test("an empty draft is a weekday morning routine in the given zone", () => {
  const d = emptyDraft("Europe/Lisbon", "r_x");
  assert.equal(d.kind, "daily");
  assert.equal(d.time, "08:00");
  assert.equal(d.timeZone, "Europe/Lisbon");
  assert.equal(d.silentWhenNothingNew, true);
});

test("a daily draft becomes trimmed server input", () => {
  const result = checkDraft(draft(), "bot_1");
  assert.deepEqual(result, {
    ok: true,
    input: {
      id: "r_1",
      botId: "bot_1",
      title: "Resumo",
      prompt: "Faça um resumo",
      schedule: { kind: "daily", time: "08:00", timeZone: "America/Sao_Paulo" },
      enabled: true,
      silentWhenNothingNew: true,
    },
  });
});

test("a weekly draft sends its days sorted", () => {
  const result = checkDraft(draft({ kind: "weekly", days: [5, 1, 0] }), "b");
  assert.ok(result.ok);
  assert.deepEqual(
    result.input.schedule.kind === "weekly" && result.input.schedule.days,
    [0, 1, 5],
  );
});

test("the first problem is named", () => {
  assert.deepEqual(checkDraft(draft({ title: "  " }), "b"), {
    ok: false,
    problem: "invalid_title",
  });
  assert.deepEqual(checkDraft(draft({ prompt: "" }), "b"), {
    ok: false,
    problem: "invalid_prompt",
  });
  assert.deepEqual(
    checkDraft(draft({ kind: "interval", everyMinutes: "2" }), "b"),
    { ok: false, problem: "interval_too_short" },
  );
  assert.deepEqual(
    checkDraft(draft({ kind: "interval", everyMinutes: "abc" }), "b"),
    { ok: false, problem: "interval_too_short" },
  );
  assert.deepEqual(checkDraft(draft({ kind: "weekly", days: [] }), "b"), {
    ok: false,
    problem: "no_days",
  });
  assert.deepEqual(checkDraft(draft({ time: "25:00" }), "b"), {
    ok: false,
    problem: "bad_time",
  });
});

test("a saved routine round-trips through the draft", () => {
  const saved = checkDraft(draft({ kind: "weekly", days: [2, 4] }), "b");
  assert.ok(saved.ok);
  const again = checkDraft(draftFromRoutine(saved.input, "UTC"), "b");
  assert.deepEqual(again, saved);
});

test("an interval routine keeps its minutes and the local zone", () => {
  const saved = checkDraft(
    draft({ kind: "interval", everyMinutes: "90" }),
    "b",
  );
  assert.ok(saved.ok);
  const d = draftFromRoutine(saved.input, "Asia/Tokyo");
  assert.equal(d.everyMinutes, "90");
  assert.equal(d.timeZone, "Asia/Tokyo");
});

test("toggling days keeps Monday-first order", () => {
  assert.deepEqual(toggleDay([1, 3], 0), [1, 3, 0]);
  assert.deepEqual(toggleDay([1, 3, 0], 3), [1, 0]);
  assert.deepEqual(toggleDay([], 6), [6]);
});
