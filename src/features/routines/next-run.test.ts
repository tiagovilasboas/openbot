import assert from "node:assert/strict";
import { test } from "node:test";
import { nextRunAt } from "./next-run.ts";

const at = (iso: string) => new Date(iso);

test("an interval counts from the given moment", () => {
  assert.equal(
    nextRunAt(
      { kind: "interval", everyMinutes: 30 },
      at("2026-11-18T10:00:00Z"),
    ).toISOString(),
    "2026-11-18T10:30:00.000Z",
  );
});

test("a daily time later today runs today, an earlier one tomorrow", () => {
  const schedule = {
    kind: "daily",
    time: "09:00",
    timeZone: "America/Sao_Paulo",
  } as const;
  // 08:00 in São Paulo (UTC-3) is 11:00Z.
  assert.equal(
    nextRunAt(schedule, at("2026-11-18T11:00:00Z")).toISOString(),
    "2026-11-18T12:00:00.000Z",
  );
  assert.equal(
    nextRunAt(schedule, at("2026-11-18T12:00:00Z")).toISOString(),
    "2026-11-19T12:00:00.000Z",
  );
});

test("the run is strictly after the given moment", () => {
  const schedule = { kind: "daily", time: "00:00", timeZone: "UTC" } as const;
  assert.equal(
    nextRunAt(schedule, at("2026-11-18T00:00:00Z")).toISOString(),
    "2026-11-19T00:00:00.000Z",
  );
});

test("weekly picks the next listed weekday and wraps the week", () => {
  // 2026-11-18 is a Wednesday.
  const schedule = {
    kind: "weekly",
    days: [1, 5],
    time: "09:00",
    timeZone: "UTC",
  } as const;
  assert.equal(
    nextRunAt(schedule, at("2026-11-18T10:00:00Z")).toISOString(),
    "2026-11-20T09:00:00.000Z",
  );
  assert.equal(
    nextRunAt(schedule, at("2026-11-20T09:00:00Z")).toISOString(),
    "2026-11-23T09:00:00.000Z",
  );
});

test("weekly on today's weekday runs today when the time is still ahead", () => {
  const schedule = {
    kind: "weekly",
    days: [3],
    time: "18:00",
    timeZone: "UTC",
  } as const;
  assert.equal(
    nextRunAt(schedule, at("2026-11-18T10:00:00Z")).toISOString(),
    "2026-11-18T18:00:00.000Z",
  );
  assert.equal(
    nextRunAt(schedule, at("2026-11-18T19:00:00Z")).toISOString(),
    "2026-11-25T18:00:00.000Z",
  );
});

test("a daily time keeps its wall clock across a spring-forward change", () => {
  const schedule = {
    kind: "daily",
    time: "09:00",
    timeZone: "America/New_York",
  } as const;
  // Before the 2026-03-08 change New York is UTC-5, after it UTC-4.
  assert.equal(
    nextRunAt(schedule, at("2026-03-07T15:00:00Z")).toISOString(),
    "2026-03-08T13:00:00.000Z",
  );
});

test("a time skipped by spring-forward moves forward by the gap", () => {
  const schedule = {
    kind: "daily",
    time: "02:30",
    timeZone: "America/New_York",
  } as const;
  // 02:30 does not exist on 2026-03-08; it runs at 03:30 EDT (07:30Z).
  assert.equal(
    nextRunAt(schedule, at("2026-03-08T05:00:00Z")).toISOString(),
    "2026-03-08T07:30:00.000Z",
  );
});

test("a time repeated by fall-back runs once, at its first occurrence", () => {
  const schedule = {
    kind: "daily",
    time: "01:30",
    timeZone: "America/New_York",
  } as const;
  // On 2026-11-01 01:30 happens at 05:30Z (EDT) and again at 06:30Z (EST).
  const first = nextRunAt(schedule, at("2026-11-01T04:00:00Z"));
  assert.equal(first.toISOString(), "2026-11-01T05:30:00.000Z");
  assert.equal(
    nextRunAt(schedule, first).toISOString(),
    "2026-11-02T06:30:00.000Z",
  );
});

test("a far-east time zone crosses the date line correctly", () => {
  const schedule = {
    kind: "daily",
    time: "07:00",
    timeZone: "Pacific/Auckland",
  } as const;
  // 2026-11-18 is daylight time in Auckland (UTC+13): 07:00 is 18:00Z the day before.
  assert.equal(
    nextRunAt(schedule, at("2026-11-18T12:00:00Z")).toISOString(),
    "2026-11-18T18:00:00.000Z",
  );
});
