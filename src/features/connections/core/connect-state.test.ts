import assert from "node:assert/strict";
import { test } from "node:test";
import {
  IDLE,
  isInFlight,
  nextConnectState,
  type ConnectEvent,
  type ConnectState,
} from "./connect-state.ts";

function run(events: ConnectEvent[], from: ConnectState = IDLE): ConnectState {
  return events.reduce(nextConnectState, from);
}

test("an OAuth Connect goes start, page, return, verify, connected", () => {
  const state = run([
    { type: "start" },
    { type: "opened" },
    { type: "returned" },
    { type: "succeeded", accountLabel: "Tiago Vilas Boas" },
  ]);
  assert.deepEqual(state, {
    phase: "connected",
    accountLabel: "Tiago Vilas Boas",
  });
});

test("a pasted key is verified and connects", () => {
  const state = run([
    { type: "submitKey" },
    { type: "succeeded", accountLabel: null },
  ]);
  assert.deepEqual(state, { phase: "connected", accountLabel: null });
});

test("a refused key fails with its reason and can be retried", () => {
  const failed = run([
    { type: "submitKey" },
    { type: "failed", reason: "invalid_key" },
  ]);
  assert.deepEqual(failed, { phase: "failed", reason: "invalid_key" });
  assert.deepEqual(nextConnectState(failed, { type: "submitKey" }), {
    phase: "verifying",
  });
});

test("waiting too long on the provider page expires, verifying does not", () => {
  assert.deepEqual(
    run([{ type: "start" }, { type: "opened" }, { type: "timedOut" }]),
    { phase: "expired" },
  );
  const verifying = run([{ type: "start" }, { type: "returned" }]);
  assert.equal(nextConnectState(verifying, { type: "timedOut" }), verifying);
});

test("cancel stops a running Connect and leaves settled states alone", () => {
  assert.deepEqual(run([{ type: "start" }, { type: "cancel" }]), IDLE);
  const connected: ConnectState = { phase: "connected", accountLabel: null };
  assert.equal(nextConnectState(connected, { type: "cancel" }), connected);
});

test("disconnect only applies to a connected service", () => {
  const connected: ConnectState = { phase: "connected", accountLabel: null };
  assert.deepEqual(nextConnectState(connected, { type: "disconnected" }), IDLE);
  const failed: ConnectState = { phase: "failed", reason: "network" };
  assert.equal(nextConnectState(failed, { type: "disconnected" }), failed);
});

test("events out of order do not move the state", () => {
  assert.equal(nextConnectState(IDLE, { type: "returned" }), IDLE);
  assert.equal(
    nextConnectState(IDLE, { type: "succeeded", accountLabel: "x" }),
    IDLE,
  );
  const waiting = run([{ type: "start" }, { type: "opened" }]);
  assert.equal(nextConnectState(waiting, { type: "start" }), waiting);
  assert.equal(nextConnectState(waiting, { type: "submitKey" }), waiting);
});

test("only starting, waiting and verifying are in flight", () => {
  assert.equal(isInFlight(IDLE), false);
  assert.equal(isInFlight({ phase: "starting" }), true);
  assert.equal(isInFlight({ phase: "waiting" }), true);
  assert.equal(isInFlight({ phase: "verifying" }), true);
  assert.equal(isInFlight({ phase: "expired" }), false);
});
