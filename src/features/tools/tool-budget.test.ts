import assert from "node:assert/strict";
import test from "node:test";
import { emptyBudget, spend, TOOL_BUDGET } from "./tool-budget.ts";

test("steps are capped at 4, counted across resumes", () => {
  let budget = emptyBudget();
  for (let i = 0; i < TOOL_BUDGET.maxSteps; i += 1) {
    const out = spend(budget, { type: "step" });
    assert.equal(out.ok, true);
    if (out.ok) budget = out.budget;
  }
  const over = spend(budget, { type: "step" });
  assert.deepEqual(over, { ok: false, exceeded: "steps_exceeded", budget });
});

test("calls are capped at 6 in total", () => {
  let budget = emptyBudget();
  for (let i = 0; i < 2; i += 1) {
    const out = spend(budget, { type: "calls", count: 3 });
    assert.equal(out.ok, true);
    if (out.ok) budget = out.budget;
  }
  assert.equal(budget.calls, 6);
  const over = spend(budget, { type: "calls", count: 1 });
  assert.equal(!over.ok && over.exceeded, "calls_exceeded");
});

test("more than 3 calls in one step is rejected", () => {
  const out = spend(emptyBudget(), { type: "calls", count: 4 });
  assert.equal(!out.ok && out.exceeded, "calls_per_step_exceeded");
});

test("result chars are capped at 24000 and the budget is unchanged on overrun", () => {
  const first = spend(emptyBudget(), { type: "result", chars: 24_000 });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const over = spend(first.budget, { type: "result", chars: 1 });
  assert.equal(!over.ok && over.exceeded, "result_chars_exceeded");
  assert.deepEqual(over.budget, first.budget);
});

test("spend does not mutate its input", () => {
  const budget = emptyBudget();
  spend(budget, { type: "step" });
  assert.deepEqual(budget, { steps: 0, calls: 0, resultChars: 0 });
});
