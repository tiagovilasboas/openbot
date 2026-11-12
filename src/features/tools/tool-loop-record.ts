import type { ToolExchange } from "../model/tool-wire.ts";
import {
  errorText,
  executeTool,
  previewOf,
  resultText,
  safeCode,
} from "./run-tool-call.ts";
import { spend, TOOL_BUDGET, type ToolBudget } from "./tool-budget.ts";
import type {
  ToolDefinition,
  ToolPolicy,
  ToolRunResult,
} from "./tool-definition.ts";
import type {
  LoopAuditEntry,
  ToolLoopEvent,
  ToolLoopInput,
} from "./tool-loop-types.ts";

type Call = ToolExchange["call"];

/** The turn's running record: every exchange so far and what it cost. */
export type LoopState = {
  transcript: ToolExchange[];
  budget: ToolBudget;
  /** Call ids already answered: a call id is never run or answered twice. */
  answered: Set<string>;
};

export function createLoopState(input: ToolLoopInput): LoopState {
  const transcript = [...input.transcript];
  return {
    transcript,
    budget: input.budget,
    answered: new Set(transcript.map((exchange) => exchange.call.id)),
  };
}

/**
 * Appends one exchange and streams its result. A success is capped to the
 * tool's limit and what is left of the turn's result budget; with nothing
 * left it becomes a budget error. Returns the audit outcome.
 */
export function* recordResult(
  state: LoopState,
  call: Call,
  result: ToolRunResult,
  maxChars: number,
): Generator<ToolLoopEvent, string> {
  const remaining = TOOL_BUDGET.maxResultChars - state.budget.resultChars;
  const outcome: ToolRunResult =
    result.ok && remaining <= 0
      ? { ok: false, code: "result_budget_exceeded" }
      : result;
  let text: string;
  let preview: string;
  if (outcome.ok) {
    const fitted = resultText(outcome.text, Math.min(maxChars, remaining));
    const spent = spend(state.budget, { type: "result", chars: fitted.chars });
    if (spent.ok) state.budget = spent.budget;
    text = fitted.text;
    preview = previewOf(outcome.text);
  } else {
    text = errorText(outcome.code);
    preview = safeCode(outcome.code);
  }
  state.transcript.push({ call, result: { ok: outcome.ok, text } });
  state.answered.add(call.id);
  yield { type: "tool_result", callId: call.id, ok: outcome.ok, preview };
  if (outcome.ok && outcome.effect?.kind === "memory_changed") {
    yield { type: "memory_changed" };
  }
  return outcome.ok ? "ok" : safeCode(outcome.code);
}

/** Records a call that never ran (bad args, over budget, denied). */
export function* recordRefusal(
  state: LoopState,
  input: ToolLoopInput,
  call: Call,
  code: string,
  audit: Pick<LoopAuditEntry, "policy" | "decision">,
): Generator<ToolLoopEvent> {
  const outcome = yield* recordResult(state, call, { ok: false, code }, 0);
  input.audit({
    ...audit,
    callId: call.id,
    toolName: call.name,
    outcome,
    durationMs: 0,
    argsJson: call.argsJson,
  });
}

/** Runs a validated call once, with its timeout, then records and audits it. */
export async function* runAndRecord(
  state: LoopState,
  input: ToolLoopInput,
  call: Call,
  tool: ToolDefinition<unknown>,
  args: unknown,
  audit: { policy: ToolPolicy; decision: LoopAuditEntry["decision"] },
): AsyncGenerator<ToolLoopEvent> {
  // Marked before running, so nothing can start the same call again.
  state.answered.add(call.id);
  const startedAt = input.clock();
  const result = await executeTool(tool, args, input.botId, input.signal);
  const durationMs = Math.max(0, input.clock() - startedAt);
  const outcome = yield* recordResult(state, call, result, tool.maxResultChars);
  input.audit({
    ...audit,
    callId: call.id,
    toolName: call.name,
    outcome,
    durationMs,
    argsJson: call.argsJson,
  });
}
