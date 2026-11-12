import { createHash } from "node:crypto";
import type { ModelMessage } from "../../model/model-adapter.ts";
import type { ToolExchange } from "../../model/tool-wire.ts";
import { TOOL_BUDGET, type ToolBudget } from "../tool-budget.ts";
import type { PendingCall } from "../tool-loop-types.ts";
import type { PendingTurn } from "./pending-turns-repository.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";

function isExchange(value: unknown): value is ToolExchange {
  if (!isRecord(value) || !isRecord(value.call) || !isRecord(value.result)) {
    return false;
  }
  const { call, result } = value;
  return (
    isString(call.id) &&
    isString(call.name) &&
    isString(call.argsJson) &&
    typeof result.ok === "boolean" &&
    isString(result.text)
  );
}

function isPendingCall(value: unknown): value is PendingCall {
  return (
    isRecord(value) &&
    isString(value.callId) &&
    isString(value.name) &&
    isString(value.argsJson) &&
    isString(value.argsDigest) &&
    isString(value.preview)
  );
}

function parseList<T>(text: string, is: (value: unknown) => value is T) {
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) && parsed.every(is) ? parsed : null;
  } catch {
    return null;
  }
}

export type DecodedTurn = {
  transcript: ToolExchange[];
  pendingCalls: PendingCall[];
  budget: ToolBudget;
};

/**
 * The server's own record of a paused turn, read back defensively: a damaged
 * row is null, never a partial transcript. The result budget is recounted
 * from the stored (wrapped) texts, so it can only err on the safe side.
 */
export function decodePendingTurn(turn: PendingTurn): DecodedTurn | null {
  const transcript = parseList(turn.transcript, isExchange);
  const pendingCalls = parseList(turn.pendingCalls, isPendingCall);
  if (!transcript || !pendingCalls || pendingCalls.length === 0) return null;
  const resultChars = transcript.reduce(
    (sum, exchange) => sum + exchange.result.text.length,
    0,
  );
  return {
    transcript,
    pendingCalls,
    budget: {
      steps: turn.stepsUsed,
      calls: turn.callsUsed,
      resultChars: Math.min(resultChars, TOOL_BUDGET.maxResultChars),
    },
  };
}

/**
 * Binds a resume to the conversation it paused: same bot, language and
 * messages. The system prompt is left out on purpose, since an approved note
 * changes the memory block between the pause and the resume.
 */
export function requestDigest(
  botId: string,
  language: string,
  messages: readonly ModelMessage[],
): string {
  return createHash("sha256")
    .update(JSON.stringify({ botId, language, messages }), "utf8")
    .digest("hex");
}
