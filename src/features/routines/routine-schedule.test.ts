import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSchedule, parseTime } from "./routine-schedule.ts";

test("an interval of at least five minutes is accepted", () => {
  assert.deepEqual(checkSchedule({ kind: "interval", everyMinutes: 5 }), {
    ok: true,
    schedule: { kind: "interval", everyMinutes: 5 },
  });
});

test("an interval below five minutes, above a week or not whole is refused", () => {
  assert.deepEqual(checkSchedule({ kind: "interval", everyMinutes: 4 }), {
    ok: false,
    problem: "interval_too_short",
  });
  assert.deepEqual(
    checkSchedule({ kind: "interval", everyMinutes: 7 * 24 * 60 + 1 }),
    {
      ok: false,
      problem: "interval_too_long",
    },
  );
  assert.equal(
    checkSchedule({ kind: "interval", everyMinutes: 7.5 }).ok,
    false,
  );
  assert.equal(
    checkSchedule({ kind: "interval", everyMinutes: "10" }).ok,
    false,
  );
});

test("a daily schedule needs an HH:MM time and a real time zone", () => {
  assert.equal(
    checkSchedule({
      kind: "daily",
      time: "08:30",
      timeZone: "America/Sao_Paulo",
    }).ok,
    true,
  );
  assert.deepEqual(
    checkSchedule({ kind: "daily", time: "8:30", timeZone: "UTC" }),
    {
      ok: false,
      problem: "bad_time",
    },
  );
  assert.deepEqual(
    checkSchedule({ kind: "daily", time: "24:00", timeZone: "UTC" }),
    {
      ok: false,
      problem: "bad_time",
    },
  );
  assert.deepEqual(
    checkSchedule({ kind: "daily", time: "08:00", timeZone: "Mars/Olympus" }),
    {
      ok: false,
      problem: "bad_time_zone",
    },
  );
});

test("a weekly schedule dedupes and sorts its days and needs at least one", () => {
  assert.deepEqual(
    checkSchedule({
      kind: "weekly",
      days: [5, 1, 1],
      time: "09:00",
      timeZone: "UTC",
    }),
    {
      ok: true,
      schedule: {
        kind: "weekly",
        days: [1, 5],
        time: "09:00",
        timeZone: "UTC",
      },
    },
  );
  assert.deepEqual(
    checkSchedule({ kind: "weekly", days: [], time: "09:00", timeZone: "UTC" }),
    {
      ok: false,
      problem: "no_days",
    },
  );
  assert.equal(
    checkSchedule({ kind: "weekly", days: [7], time: "09:00", timeZone: "UTC" })
      .ok,
    false,
  );
});

test("anything else is an unknown kind, never a throw", () => {
  for (const input of [null, undefined, 3, "daily", {}, { kind: "cron" }]) {
    assert.deepEqual(checkSchedule(input), {
      ok: false,
      problem: "unknown_kind",
    });
  }
});

test("parseTime reads valid times only", () => {
  assert.deepEqual(parseTime("00:00"), { hour: 0, minute: 0 });
  assert.deepEqual(parseTime("23:59"), { hour: 23, minute: 59 });
  assert.equal(parseTime("12:60"), null);
  assert.equal(parseTime(1200), null);
});
