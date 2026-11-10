import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isUsageDay, lastDays, localDay } from "./usage-day.ts";
import {
  addCall,
  clearBot,
  lastSevenDays,
  totalForBot,
  USAGE_MAX_COUNT,
  USAGE_MAX_DAYS,
  type UsageRecord,
} from "./usage-record.ts";

const NONE: UsageRecord[] = [];

describe("adding a call", () => {
  it("sums the counts of calls on the same day for the same bot", () => {
    let records = addCall(
      NONE,
      "a",
      { inputTokens: 10, outputTokens: 5 },
      "2026-03-01",
    );
    records = addCall(
      records,
      "a",
      { inputTokens: 1, outputTokens: 2 },
      "2026-03-01",
    );
    assert.deepEqual(records, [
      {
        botId: "a",
        day: "2026-03-01",
        inputTokens: 11,
        outputTokens: 7,
        calls: 2,
        callsWithoutUsage: 0,
      },
    ]);
  });

  it("counts a call without usage apart and adds no tokens", () => {
    let records = addCall(
      NONE,
      "a",
      { inputTokens: 4, outputTokens: 4 },
      "2026-03-01",
    );
    records = addCall(records, "a", undefined, "2026-03-01");
    records = addCall(records, "a", {}, "2026-03-01");
    const total = totalForBot(records, "a");
    assert.equal(total.calls, 3);
    assert.equal(total.callsWithoutUsage, 2);
    assert.equal(total.inputTokens, 4);
    assert.equal(total.outputTokens, 4);
  });

  it("keeps a one-sided usage as a call with data", () => {
    const records = addCall(NONE, "a", { outputTokens: 9 }, "2026-03-01");
    assert.equal(records[0]?.callsWithoutUsage, 0);
    assert.equal(records[0]?.inputTokens, 0);
    assert.equal(records[0]?.outputTokens, 9);
  });

  it("starts a new record when the local day changes", () => {
    let records = addCall(NONE, "a", { inputTokens: 1 }, "2026-03-01");
    records = addCall(records, "a", { inputTokens: 2 }, "2026-03-02");
    assert.equal(records.length, 2);
    assert.equal(totalForBot(records, "a").inputTokens, 3);
  });

  it("does not mutate what it was given", () => {
    const before = addCall(NONE, "a", { inputTokens: 1 }, "2026-03-01");
    const snapshot = JSON.stringify(before);
    addCall(before, "a", { inputTokens: 5 }, "2026-03-01");
    assert.equal(JSON.stringify(before), snapshot);
  });

  it("never passes the ceiling", () => {
    const big = addCall(
      NONE,
      "a",
      { inputTokens: USAGE_MAX_COUNT },
      "2026-03-01",
    );
    const more = addCall(big, "a", { inputTokens: 5 }, "2026-03-01");
    assert.equal(more[0]?.inputTokens, USAGE_MAX_COUNT);
  });

  it("keeps only the newest days of a bot", () => {
    let records = NONE;
    for (const day of lastDays("2026-12-31", USAGE_MAX_DAYS + 10)) {
      records = addCall(records, "a", { inputTokens: 1 }, day);
    }
    records = addCall(records, "b", { inputTokens: 1 }, "2020-01-01");
    assert.equal(records.filter((r) => r.botId === "a").length, USAGE_MAX_DAYS);
    assert.equal(
      records.some((r) => r.botId === "a" && r.day < "2026-10-01"),
      false,
    );
    assert.equal(records.filter((r) => r.botId === "b").length, 1);
  });
});

describe("reading usage", () => {
  const records = [
    ...addCall(NONE, "a", { inputTokens: 100, outputTokens: 10 }, "2026-03-10"),
    ...addCall(NONE, "a", { inputTokens: 1, outputTokens: 1 }, "2026-03-04"),
    ...addCall(
      NONE,
      "a",
      { inputTokens: 1000, outputTokens: 100 },
      "2026-03-03",
    ),
    ...addCall(NONE, "b", { inputTokens: 7, outputTokens: 7 }, "2026-03-10"),
  ];

  it("totals every kept day of one bot only", () => {
    const total = totalForBot(records, "a");
    assert.equal(total.inputTokens, 1101);
    assert.equal(total.outputTokens, 111);
    assert.equal(total.calls, 3);
    assert.deepEqual(totalForBot(records, "nobody"), {
      inputTokens: 0,
      outputTokens: 0,
      calls: 0,
      callsWithoutUsage: 0,
    });
  });

  it("the last 7 days include today and the 6 days before it", () => {
    // 2026-03-04 is the 7th day counting back from 03-10; 03-03 is the 8th.
    const week = lastSevenDays(records, "a", "2026-03-10");
    assert.equal(week.inputTokens, 101);
    assert.equal(week.calls, 2);
  });

  it("the window follows the calendar across a month end", () => {
    assert.deepEqual(lastDays("2026-03-02", 4), [
      "2026-03-02",
      "2026-03-01",
      "2026-02-28",
      "2026-02-27",
    ]);
    assert.deepEqual(lastDays("2028-03-01", 2), ["2028-03-01", "2028-02-29"]);
  });

  it("clears one bot and leaves the others", () => {
    const left = clearBot(records, "a");
    assert.equal(totalForBot(left, "a").calls, 0);
    assert.equal(totalForBot(left, "b").calls, 1);
  });
});

describe("days", () => {
  it("names the local day, padded", () => {
    assert.equal(localDay(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
    assert.equal(localDay(new Date(2026, 11, 31, 0, 0)), "2026-12-31");
  });

  it("accepts only real calendar days", () => {
    assert.equal(isUsageDay("2026-02-28"), true);
    assert.equal(isUsageDay("2028-02-29"), true);
    assert.equal(isUsageDay("2026-02-29"), false);
    assert.equal(isUsageDay("2026-13-01"), false);
    assert.equal(isUsageDay("2026-1-1"), false);
    assert.equal(isUsageDay("__proto__"), false);
    assert.equal(isUsageDay(20260101), false);
  });
});
