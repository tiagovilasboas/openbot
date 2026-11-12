import assert from "node:assert/strict";
import { test } from "node:test";
import { expiryText, offersAlways } from "./approval-view.ts";
import type { ApprovalCall } from "../tool-turn-events.ts";

const call = (allowAlways: boolean): ApprovalCall => ({
  callId: "c1",
  name: "memory_add_note",
  preview: "gosta de chá",
  argsDigest: "a".repeat(64),
  allowAlways,
});

const pause = (...calls: ApprovalCall[]) => ({
  turnId: "0f8e6c2a-1b2c-4d5e-8f90-123456789abc",
  calls,
  expiresAt: 0,
});

test("the expiry reads as a local clock time in each language", () => {
  const at = new Date(2026, 10, 12, 14, 5).getTime();
  assert.equal(expiryText(at, "pt"), "Expira às 14:05");
  assert.match(expiryText(at, "en"), /^Expires at \d{1,2}:05/);
  assert.match(expiryText(at, "es"), /14:05/);
});

test("always allow is offered only when a waiting call allows it", () => {
  assert.equal(offersAlways(pause(call(false))), false);
  assert.equal(offersAlways(pause(call(false), call(true))), true);
});
