import assert from "node:assert/strict";
import test from "node:test";
import { connectGate } from "./connect-gate.ts";

test("a ready model opens the gate, checked or not", () => {
  assert.equal(
    connectGate({ isConfigured: true, serverChecked: false }),
    "open",
  );
  assert.equal(
    connectGate({ isConfigured: true, serverChecked: true }),
    "open",
  );
});

test("no model waits for the server before locking", () => {
  assert.equal(
    connectGate({ isConfigured: false, serverChecked: false }),
    "checking",
  );
  assert.equal(
    connectGate({ isConfigured: false, serverChecked: true }),
    "locked",
  );
});
