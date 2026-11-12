import type { ToolPolicy } from "../tool-definition.ts";
import type { ApprovalCall } from "../tool-turn-events.ts";

/** What the tool route says about a turn besides the model's own text. */
export type ToolProgressEvent =
  | {
      type: "tool_call";
      callId: string;
      name: string;
      preview: string;
      policy: ToolPolicy;
    }
  | { type: "tool_result"; callId: string; ok: boolean; preview: string }
  | { type: "tools_unavailable" }
  | { type: "memory_changed" };

/** The turn stopped: these calls wait for the user until expiresAt. */
export type ApprovalPause = {
  turnId: string;
  calls: ApprovalCall[];
  expiresAt: number;
};

export type ToolStreamEvent =
  ToolProgressEvent | ({ type: "approval_required" } & ApprovalPause);

const TURN_ID = /^[0-9a-f-]{36}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const ID_MAX = 64;
/** Previews are one short line on the server; anything longer is cut. */
export const TOOL_PREVIEW_MAX = 300;
const MAX_PENDING_CALLS = 3;

function id(value: unknown): string | null {
  return typeof value === "string" && value && value.length <= ID_MAX
    ? value
    : null;
}

function preview(value: unknown): string {
  return typeof value === "string" ? value.slice(0, TOOL_PREVIEW_MAX) : "";
}

function approvalCall(raw: unknown): ApprovalCall | null {
  if (typeof raw !== "object" || raw === null) return null;
  const call = raw as Record<string, unknown>;
  const callId = id(call.callId);
  const name = id(call.name);
  if (!callId || !name) return null;
  if (typeof call.argsDigest !== "string" || !DIGEST.test(call.argsDigest)) {
    return null;
  }
  return {
    callId,
    name,
    preview: preview(call.preview),
    argsDigest: call.argsDigest,
    allowAlways: call.allowAlways === true,
  };
}

function approvalRequired(
  raw: Record<string, unknown>,
): ToolStreamEvent | null {
  const { turnId, calls, expiresAt } = raw;
  if (typeof turnId !== "string" || !TURN_ID.test(turnId)) return null;
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return null;
  if (!Array.isArray(calls) || calls.length === 0) return null;
  if (calls.length > MAX_PENDING_CALLS) return null;
  const parsed = calls.map(approvalCall);
  if (parsed.some((call) => call === null)) return null;
  return {
    type: "approval_required",
    turnId,
    calls: parsed as ApprovalCall[],
    expiresAt,
  };
}

/**
 * One tool event of the /api/chat/tools stream, checked field by field. A
 * malformed event is dropped (null), like any unknown line.
 */
export function parseToolEvent(
  raw: Record<string, unknown>,
): ToolStreamEvent | null {
  switch (raw.type) {
    case "tool_call": {
      const callId = id(raw.callId);
      const name = id(raw.name);
      if (!callId || !name) return null;
      if (raw.policy !== "auto" && raw.policy !== "ask") return null;
      const event = { callId, name, preview: preview(raw.preview) };
      return { type: "tool_call", ...event, policy: raw.policy };
    }
    case "tool_result": {
      const callId = id(raw.callId);
      if (!callId || typeof raw.ok !== "boolean") return null;
      return {
        type: "tool_result",
        callId,
        ok: raw.ok,
        preview: preview(raw.preview),
      };
    }
    case "approval_required":
      return approvalRequired(raw);
    case "tools_unavailable":
      return { type: "tools_unavailable" };
    case "memory_changed":
      return { type: "memory_changed" };
    default:
      return null;
  }
}
