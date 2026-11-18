import { decideTool } from "./tool-policy.ts";
import {
  recordAnswer,
  recordRefusal,
  runAndRecord,
  type LoopState,
} from "./tool-loop-record.ts";
import type {
  PendingCall,
  ResumeDecision,
  ToolLoopEvent,
  ToolLoopInput,
} from "./tool-loop-types.ts";
import type { ToolRunResult } from "./tool-definition.ts";
import { validateCall } from "./validate-args.ts";

/**
 * Applies the user's decisions to the calls the server stored. Only stored
 * calls run, with their stored arguments; a decision must name a stored call
 * id and the digest of its stored arguments. A missing or mismatched
 * decision denies the call. Each stored call is answered exactly once.
 */
export async function* resolvePendingCalls(
  state: LoopState,
  input: ToolLoopInput,
  pendingCalls: readonly PendingCall[],
  decisions: readonly ResumeDecision[],
): AsyncGenerator<ToolLoopEvent> {
  for (const pending of pendingCalls) {
    if (input.signal.aborted) return;
    const call = {
      id: pending.callId,
      name: pending.name,
      argsJson: pending.argsJson,
    };
    if (state.answered.has(call.id)) continue;
    const tool = input.tools.get(call.name);
    const gate = tool
      ? decideTool(tool, input.botId, input.grants, input.levels)
      : "ask";
    const policy = gate === "block" || tool?.answer ? "ask" : gate;
    // A tool blocked after the pause is refused even if the user approved it.
    if (gate === "block") {
      yield* recordRefusal(state, input, call, "tool_blocked", {
        policy,
        decision: "rejected",
      });
      continue;
    }
    const decision = decisions.find((item) => item.callId === call.id);
    const intact =
      input.digest(pending.argsJson) === pending.argsDigest &&
      decision?.argsDigest === pending.argsDigest;
    if (!decision || !intact) {
      yield* recordRefusal(state, input, call, "approval_mismatch", {
        policy,
        decision: "rejected",
      });
      continue;
    }
    if (decision.decision === "deny") {
      yield* recordRefusal(state, input, call, "denied_by_user", {
        policy,
        decision: "deny",
      });
      continue;
    }
    const validated = validateCall(call, input.tools);
    if (!validated.ok) {
      yield* recordRefusal(state, input, call, validated.code, {
        policy,
        decision: decision.decision,
      });
      continue;
    }
    const audit = { policy, decision: decision.decision };
    if (validated.tool.answer) {
      // The answer is checked against the stored arguments, never trusted.
      let result: ToolRunResult;
      try {
        result = validated.tool.answer(validated.args, decision.answer);
      } catch {
        result = { ok: false, code: "bad_answer" };
      }
      yield* recordAnswer(state, input, call, validated.tool, result, audit);
      continue;
    }
    yield* runAndRecord(
      state,
      input,
      call,
      validated.tool,
      validated.args,
      audit,
    );
  }
}
