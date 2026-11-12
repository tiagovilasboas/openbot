// Per-turn caps for the tool loop, as a pure reducer. Steps and calls are
// counted across resumes, so the stored counters feed back in.
export const TOOL_BUDGET = {
  maxSteps: 4,
  maxCalls: 6,
  maxCallsPerStep: 3,
  maxResultChars: 24_000,
} as const;

export type ToolBudget = {
  steps: number;
  calls: number;
  resultChars: number;
};

export type BudgetExceeded =
  | "steps_exceeded"
  | "calls_exceeded"
  | "calls_per_step_exceeded"
  | "result_chars_exceeded";

export type BudgetEvent =
  | { type: "step" }
  | { type: "calls"; count: number }
  | { type: "result"; chars: number };

export type BudgetOutcome =
  | { ok: true; budget: ToolBudget }
  | { ok: false; exceeded: BudgetExceeded; budget: ToolBudget };

export const emptyBudget = (): ToolBudget => ({
  steps: 0,
  calls: 0,
  resultChars: 0,
});

// Returns the next budget, or the cause of the overrun with the budget
// unchanged so the caller can stop and report.
export function spend(budget: ToolBudget, event: BudgetEvent): BudgetOutcome {
  const fail = (exceeded: BudgetExceeded): BudgetOutcome => ({
    ok: false,
    exceeded,
    budget,
  });
  switch (event.type) {
    case "step":
      return budget.steps + 1 > TOOL_BUDGET.maxSteps
        ? fail("steps_exceeded")
        : { ok: true, budget: { ...budget, steps: budget.steps + 1 } };
    case "calls":
      if (event.count > TOOL_BUDGET.maxCallsPerStep) {
        return fail("calls_per_step_exceeded");
      }
      return budget.calls + event.count > TOOL_BUDGET.maxCalls
        ? fail("calls_exceeded")
        : {
            ok: true,
            budget: { ...budget, calls: budget.calls + event.count },
          };
    case "result":
      return budget.resultChars + event.chars > TOOL_BUDGET.maxResultChars
        ? fail("result_chars_exceeded")
        : {
            ok: true,
            budget: {
              ...budget,
              resultChars: budget.resultChars + event.chars,
            },
          };
  }
}
