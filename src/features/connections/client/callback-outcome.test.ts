import assert from "node:assert/strict";
import { test } from "node:test";
import { IDLE, nextConnectState, type ConnectState } from "../core/index.ts";
import { eventsForOutcome, outcomeFromResponse } from "./callback-outcome.ts";

test("maps each callback answer to an outcome", () => {
  assert.deepEqual(outcomeFromResponse(200, { status: "connected" }), {
    status: "connected",
  });
  assert.deepEqual(outcomeFromResponse(410, { status: "expired" }), {
    status: "expired",
  });
  assert.deepEqual(outcomeFromResponse(502, null), {
    status: "failed",
    reason: "network",
  });
  assert.deepEqual(outcomeFromResponse(500, null), {
    status: "failed",
    reason: "unavailable",
  });
});

test("reads the failure from reason or from status", () => {
  for (const reason of ["state_mismatch", "denied", "invalid_key"] as const) {
    const expected = { status: "failed", reason };
    assert.deepEqual(
      outcomeFromResponse(400, { status: "failed", reason }),
      expected,
    );
    assert.deepEqual(outcomeFromResponse(400, { status: reason }), expected);
  }
  assert.deepEqual(outcomeFromResponse(400, { status: "weird" }), {
    status: "failed",
    reason: "unavailable",
  });
});

function run(outcome: Parameters<typeof eventsForOutcome>[0]): ConnectState {
  return eventsForOutcome(outcome).reduce(nextConnectState, IDLE);
}

test("events drive the reducer to the final state", () => {
  assert.deepEqual(run({ status: "connected" }), {
    phase: "connected",
    accountLabel: null,
  });
  assert.deepEqual(run({ status: "expired" }), { phase: "expired" });
  assert.deepEqual(run({ status: "failed", reason: "denied" }), {
    phase: "failed",
    reason: "denied",
  });
});
