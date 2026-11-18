import type { ChatStreamEvent } from "../model/stream-events.ts";
import type { ToolCallChunk } from "../model/tool-wire.ts";
import { previewOf } from "./run-tool-call.ts";
import { resolvePendingCalls } from "./resolve-pending-calls.ts";
import { spend, TOOL_BUDGET, type ToolBudget } from "./tool-budget.ts";
import {
  createLoopState,
  recordRefusal,
  runAndRecord,
  type LoopState,
} from "./tool-loop-record.ts";
import type {
  PendingCall,
  ToolLoopEvent,
  ToolLoopInput,
  ToolLoopOutcome,
} from "./tool-loop-types.ts";
import { decideTool, levelOf } from "./tool-policy.ts";
import { toolSpecs } from "./tool-registry.ts";
import { validateCall } from "./validate-args.ts";

type Done = Extract<ChatStreamEvent, { type: "done" }>;
type StepResult =
  | { kind: "calls"; calls: ToolCallChunk[]; done: Done }
  | { kind: "final"; done: Done }
  | { kind: "error" }
  | { kind: "aborted" };

/**
 * Tools are offered only while a later step is still possible and calls and
 * result budget remain, so the last step always answers in text and a pause
 * always leaves a step for the resume.
 */
function canOfferTools(afterStep: ToolBudget): boolean {
  return (
    afterStep.steps < TOOL_BUDGET.maxSteps &&
    afterStep.calls < TOOL_BUDGET.maxCalls &&
    afterStep.resultChars < TOOL_BUDGET.maxResultChars
  );
}

function addUsage(into: Done["usage"], more: Done["usage"]): Done["usage"] {
  if (!more) return into;
  if (!into) return more;
  const sum = (a?: number, b?: number) =>
    a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0);
  return {
    inputTokens: sum(into.inputTokens, more.inputTokens),
    outputTokens: sum(into.outputTokens, more.outputTokens),
  };
}

const outcomeOf = (state: LoopState) => ({
  transcript: state.transcript,
  budget: state.budget,
});

/**
 * The bounded tool loop: model step, then the calls it asked for, then the
 * next step, until the model answers in text, a call needs the user, or a
 * cap ends it. All I/O is injected. Only the first `start` and the last
 * `done` reach the client, with token usage summed over the steps.
 */
export async function* runToolLoop(
  input: ToolLoopInput,
): AsyncGenerator<ToolLoopEvent, ToolLoopOutcome> {
  const state = createLoopState(input);
  // A blocked tool is not offered; handleCalls still refuses it if the model
  // asks for it anyway.
  const specs = toolSpecs(input.tools).filter((spec) => {
    const tool = input.tools.get(spec.name);
    return !tool || levelOf(tool, input.levels) !== "block";
  });
  let started = false;
  let usage: Done["usage"];

  if (input.resume) {
    yield* resolvePendingCalls(
      state,
      input,
      input.resume.pendingCalls,
      input.resume.decisions,
    );
  }

  for (;;) {
    if (input.signal.aborted) return { kind: "aborted" };
    const stepped = spend(state.budget, { type: "step" });
    if (!stepped.ok) {
      yield { type: "error", code: "unknown", provider: null };
      return { kind: "error", ...outcomeOf(state) };
    }
    state.budget = stepped.budget;
    const offer = canOfferTools(state.budget);

    let result: StepResult = { kind: "aborted" };
    const calls: ToolCallChunk[] = [];
    for await (const event of input.step({
      ...(offer && specs.length > 0 ? { tools: specs } : {}),
      toolTranscript: [...state.transcript],
    })) {
      if (event.type === "start") {
        if (!started) yield event;
        started = true;
      } else if (event.type === "delta") {
        yield event;
      } else if (event.type === "tool_call") {
        calls.push(event);
      } else if (event.type === "done") {
        usage = addUsage(usage, event.usage);
        result =
          offer && calls.length > 0
            ? { kind: "calls", calls, done: event }
            : { kind: "final", done: event };
      } else {
        yield event;
        result = { kind: "error" };
      }
    }
    if (result.kind === "aborted" || input.signal.aborted) {
      return { kind: "aborted" };
    }
    if (result.kind === "error") return { kind: "error", ...outcomeOf(state) };
    if (result.kind === "final") {
      const done: Done = { ...result.done };
      delete done.usage;
      yield usage ? { ...done, usage } : done;
      return { kind: "done", ...outcomeOf(state) };
    }

    const pending = yield* handleCalls(state, input, result.calls);
    if (input.signal.aborted) return { kind: "aborted" };
    if (pending.length > 0) {
      return {
        kind: "approval_required",
        ...outcomeOf(state),
        pendingCalls: pending,
      };
    }
  }
}

/**
 * Runs the auto calls of one step and returns the ones that need the user.
 * Calls past the per-step or per-turn cap, repeated ids, unknown tools and
 * bad arguments are answered with an error and never run.
 */
async function* handleCalls(
  state: LoopState,
  input: ToolLoopInput,
  calls: readonly ToolCallChunk[],
): AsyncGenerator<ToolLoopEvent, PendingCall[]> {
  const pending: PendingCall[] = [];
  const thisStep = new Set<string>();
  let taken = 0;
  for (const chunk of calls) {
    if (input.signal.aborted) break;
    const call = { id: chunk.id, name: chunk.name, argsJson: chunk.argsJson };
    // A repeated id cannot be answered twice on the wire: drop it.
    if (state.answered.has(call.id) || thisStep.has(call.id)) continue;
    thisStep.add(call.id);
    const tool = input.tools.get(call.name);
    const decision = tool
      ? decideTool(tool, input.botId, input.grants, input.levels)
      : "auto";
    // A tool the user answers always counts as asking.
    const policy = decision === "block" || tool?.answer ? "ask" : decision;
    const preview = previewOf(`${call.name} ${call.argsJson}`);
    yield {
      type: "tool_call",
      callId: call.id,
      name: call.name,
      preview,
      policy,
    };

    const counted =
      taken < TOOL_BUDGET.maxCallsPerStep
        ? spend(state.budget, { type: "calls", count: 1 })
        : null;
    if (!counted?.ok) {
      yield* recordRefusal(state, input, call, "call_budget_exceeded", {
        policy,
        decision: "rejected",
      });
      continue;
    }
    taken += 1;
    state.budget = counted.budget;
    if (decision === "block") {
      yield* recordRefusal(state, input, call, "tool_blocked", {
        policy,
        decision: "rejected",
      });
      continue;
    }
    const validated = chunk.argsError
      ? ({ ok: false, code: "bad_json" } as const)
      : validateCall(call, input.tools);
    if (!validated.ok) {
      yield* recordRefusal(state, input, call, validated.code, {
        policy,
        decision: "rejected",
      });
      continue;
    }
    // A tool the user answers always waits for them, whatever its level.
    if (policy === "ask" || validated.tool.answer) {
      pending.push({
        callId: call.id,
        name: call.name,
        argsJson: call.argsJson,
        argsDigest: input.digest(call.argsJson),
        preview,
      });
      input.audit({
        callId: call.id,
        toolName: call.name,
        policy,
        decision: "asked",
        outcome: "pending",
        durationMs: 0,
        argsJson: call.argsJson,
      });
      continue;
    }
    yield* runAndRecord(state, input, call, validated.tool, validated.args, {
      policy,
      decision: "auto",
    });
  }
  return pending;
}
