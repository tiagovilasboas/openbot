import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeCrewStop, toCrewStopRecord } from "./crew-stop-record.ts";

test("keeps only known reasons and a sane limit", () => {
  assert.deepEqual(sanitizeCrewStop({ reason: "echo", botId: "x" }), {
    reason: "echo",
  });
  assert.deepEqual(sanitizeCrewStop({ reason: "max_rounds", limit: 5 }), {
    reason: "max_rounds",
    limit: 5,
  });
  assert.equal(sanitizeCrewStop({ reason: "max_rounds", limit: -1 })?.limit, 8);
  assert.equal(sanitizeCrewStop({ reason: "nope" }), undefined);
  assert.equal(sanitizeCrewStop("echo"), undefined);
});

test("a loop stop becomes a record without bot ids", () => {
  assert.deepEqual(
    toCrewStopRecord({ reason: "ping_pong", botIds: ["a", "b"] }),
    { reason: "ping_pong" },
  );
});
