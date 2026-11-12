import type { DatabaseSync } from "node:sqlite";
import type { ResumeDecision } from "../tool-loop-types.ts";
import type { ToolRegistry } from "../tool-registry.ts";
import { digestArgs } from "./audit-repository.ts";
import { grantTool } from "./grants-repository.ts";
import { decodePendingTurn, type DecodedTurn } from "./pending-turn-codec.ts";
import {
  closePendingTurn,
  loadPendingTurn,
} from "./pending-turns-repository.ts";

export type ResumeRequest = { turnId: string; decisions: ResumeDecision[] };

export type CheckedResume =
  | { ok: true; turn: DecodedTurn }
  | {
      ok: false;
      status: number;
      error: "turn_expired" | "digest_mismatch" | "turn_damaged";
    };

/**
 * Loads the paused turn from the server's own record. The client's copy of
 * the transcript is never read; the request must be the one that paused.
 */
export function checkResume(
  db: DatabaseSync,
  botId: string,
  resume: ResumeRequest,
  digest: string,
  now: number,
): CheckedResume {
  const stored = loadPendingTurn(db, botId, now);
  if (!stored || stored.id !== resume.turnId) {
    return { ok: false, status: 410, error: "turn_expired" };
  }
  if (stored.requestDigest !== digest) {
    return { ok: false, status: 409, error: "digest_mismatch" };
  }
  const turn = decodePendingTurn(stored);
  if (!turn) {
    closePendingTurn(db, stored.id, "expired");
    return { ok: false, status: 410, error: "turn_damaged" };
  }
  return { ok: true, turn };
}

/** Whether a decision names this stored call and its stored arguments. */
function boundDecision(
  turn: DecodedTurn,
  decision: ResumeDecision,
): string | null {
  const call = turn.pendingCalls.find(
    (item) => item.callId === decision.callId,
  );
  if (!call || call.argsDigest !== decision.argsDigest) return null;
  return digestArgs(call.argsJson) === call.argsDigest ? call.name : null;
}

/**
 * Claims the paused turn so it runs once: of two concurrent resumes only one
 * closes it. Denied when no stored call was approved.
 */
export function claimTurn(
  db: DatabaseSync,
  resume: ResumeRequest,
  turn: DecodedTurn,
): boolean {
  const approved = resume.decisions.some(
    (decision) =>
      decision.decision !== "deny" && boundDecision(turn, decision) !== null,
  );
  return closePendingTurn(db, resume.turnId, approved ? "completed" : "denied");
}

/**
 * Records always-allow for the bound "always" decisions, and only for tools
 * that offer it. Nothing else (model, skills, imports) can create a grant.
 */
export function recordGrants(
  db: DatabaseSync,
  botId: string,
  tools: ToolRegistry,
  resume: ResumeRequest,
  turn: DecodedTurn,
  now: number,
): void {
  for (const decision of resume.decisions) {
    if (decision.decision !== "always") continue;
    const name = boundDecision(turn, decision);
    if (name && tools.get(name)?.allowAlways) grantTool(db, botId, name, now);
  }
}
