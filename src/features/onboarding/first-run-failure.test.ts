import assert from "node:assert/strict";
import test from "node:test";

import { showFirstRunFailure } from "./first-run-failure.ts";

const flow = (id: string | null, phase: string) => ({ id, state: { phase } });

test("a failed or expired OpenRouter connect from the first run shows the notice", () => {
  assert.equal(showFirstRunFailure(flow("router", "failed"), true), true);
  assert.equal(showFirstRunFailure(flow("router", "expired"), true), true);
});

test("other outcomes, providers or origins show nothing", () => {
  assert.equal(showFirstRunFailure(flow("router", "connected"), true), false);
  assert.equal(showFirstRunFailure(flow("router", "verifying"), true), false);
  assert.equal(showFirstRunFailure(flow(null, "idle"), true), false);
  assert.equal(showFirstRunFailure(flow("github", "failed"), true), false);
  assert.equal(showFirstRunFailure(flow("router", "failed"), false), false);
});
