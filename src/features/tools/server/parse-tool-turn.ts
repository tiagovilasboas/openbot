import { isValidBotId } from "../../bots/bot-id.ts";
import { TOOL_BUDGET } from "../tool-budget.ts";
import type { ResumeDecision } from "../tool-loop-types.ts";

/** The tool-specific fields of a /api/chat/tools request. */
export type ToolTurnFields = {
  botId: string | null;
  /** The bot's own opt-in, sent by the client with each request. */
  toolsEnabled: boolean;
  /** Crew turns (the Chief and specialists) never get tools in v1. */
  crew: boolean;
  resume: { turnId: string; decisions: ResumeDecision[] } | null;
};

const TURN_ID = /^[0-9a-f-]{36}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const DECISIONS = new Set(["once", "always", "deny"]);
const MAX_CALL_ID_CHARS = 64;

function parseDecision(raw: unknown): ResumeDecision | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { callId, decision, argsDigest } = raw as Record<string, unknown>;
  if (
    typeof callId !== "string" ||
    !callId ||
    callId.length > MAX_CALL_ID_CHARS ||
    typeof decision !== "string" ||
    !DECISIONS.has(decision) ||
    typeof argsDigest !== "string" ||
    !DIGEST.test(argsDigest)
  ) {
    return null;
  }
  return {
    callId,
    decision: decision as ResumeDecision["decision"],
    argsDigest,
  };
}

function parseResume(raw: unknown): ToolTurnFields["resume"] | false {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object") return false;
  const { turnId, decisions } = raw as Record<string, unknown>;
  if (typeof turnId !== "string" || !TURN_ID.test(turnId)) return false;
  if (
    !Array.isArray(decisions) ||
    decisions.length === 0 ||
    decisions.length > TOOL_BUDGET.maxCallsPerStep
  ) {
    return false;
  }
  const parsed = decisions.map(parseDecision);
  if (parsed.some((item) => item === null)) return false;
  const valid = parsed as ResumeDecision[];
  const ids = new Set(valid.map((item) => item.callId));
  if (ids.size !== valid.length) return false;
  return { turnId, decisions: valid };
}

export function parseToolTurnFields(
  payload: unknown,
): { ok: true; fields: ToolTurnFields } | { ok: false } {
  if (typeof payload !== "object" || payload === null) return { ok: false };
  const body = payload as Record<string, unknown>;
  const botId = body.botId === undefined ? null : body.botId;
  if (botId !== null && !isValidBotId(botId)) return { ok: false };
  const resume = parseResume(body.resume);
  if (resume === false || (resume && botId === null)) return { ok: false };
  return {
    ok: true,
    fields: {
      botId,
      toolsEnabled: body.toolsEnabled === true,
      crew: body.crew === true,
      resume,
    },
  };
}

/** OPENBOT_TOOLS turns the tool route on; unset, empty, 0/false/off keep it off. */
export function toolsGateOn(env: Record<string, string | undefined>): boolean {
  const value = env.OPENBOT_TOOLS?.trim().toLowerCase();
  return Boolean(value) && !["0", "false", "off", "no"].includes(value!);
}
