import assert from "node:assert/strict";
import { test } from "node:test";
import {
  capAssignments,
  CHANNEL_ASSIGNMENT_LIMIT,
  CHANNEL_PARALLEL_LIMIT,
  checkAssignmentLimit,
  checkParallelLimit,
} from "./channel-limits.ts";

test("a request may start up to eight assignments", () => {
  assert.equal(CHANNEL_ASSIGNMENT_LIMIT, 8);
  assert.deepEqual(checkAssignmentLimit(8), { allowed: true });
  assert.deepEqual(checkAssignmentLimit(9), {
    allowed: false,
    reason: "assignment_limit",
  });
  assert.equal(
    capAssignments(Array.from({ length: 12 }, (_, i) => i)).length,
    8,
  );
});

test("a channel runs at most two turns at once", () => {
  assert.equal(CHANNEL_PARALLEL_LIMIT, 2);
  assert.deepEqual(checkParallelLimit(1), { allowed: true });
  assert.deepEqual(checkParallelLimit(2), {
    allowed: false,
    reason: "parallel_limit",
  });
});
