import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dispatchConnect,
  readConnectFlow,
  resetConnectFlow,
  subscribeConnectFlow,
} from "./connect-flow-store.ts";

test("the store follows the reducer and notifies listeners", () => {
  let notified = 0;
  const unsubscribe = subscribeConnectFlow(() => {
    notified += 1;
  });
  dispatchConnect("router", { type: "start" });
  dispatchConnect("router", { type: "opened" });
  assert.deepEqual(readConnectFlow(), {
    id: "router",
    state: { phase: "waiting" },
  });
  const seen = notified;
  dispatchConnect("router", { type: "disconnected" });
  assert.equal(notified, seen, "an event that does not fit changes nothing");
  resetConnectFlow();
  assert.equal(readConnectFlow().state.phase, "idle");
  unsubscribe();
});
