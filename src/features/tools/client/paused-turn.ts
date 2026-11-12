import type { ApprovalDecision } from "../tool-definition.ts";
import {
  expirePending,
  markPending,
  type LiveToolStep,
} from "./live-tool-steps.ts";
import type { ClientDecision, ToolTurnRequest } from "./tool-route.ts";
import type { ApprovalPause } from "./tool-stream-events.ts";

export type DecisionChoice = ApprovalDecision["decision"];

/**
 * A tool turn waiting for the user. `request` is exactly what was sent: a
 * resume re-sends it unchanged, since the server binds the pause to it.
 */
export type PausedTurn<Request> = {
  botId: string;
  /** The stored assistant message that holds the turn so far. */
  messageId: number;
  pause: ApprovalPause;
  request: Request;
  /** The reply text that arrived before the pause. */
  text: string;
  steps: LiveToolStep[];
};

export function pauseTurn<Request>(input: {
  botId: string;
  messageId: number;
  pause: ApprovalPause;
  request: Request;
  text: string;
  steps: readonly LiveToolStep[];
}): PausedTurn<Request> {
  return { ...input, steps: markPending(input.steps, input.pause.calls) };
}

/**
 * One choice for every waiting call, each bound to its digest. "always" is
 * only sent for a tool that offers it; elsewhere it means "once".
 */
export function decisionsFor(
  pause: ApprovalPause,
  choice: DecisionChoice,
): ClientDecision[] {
  return pause.calls.map((call) => ({
    callId: call.callId,
    decision: choice === "always" && !call.allowAlways ? "once" : choice,
    argsDigest: call.argsDigest,
  }));
}

/** The tool fields of the resume request for these decisions. */
export function resumeRequestFor(
  paused: PausedTurn<unknown>,
  decisions: ClientDecision[],
): ToolTurnRequest {
  return {
    botId: paused.botId,
    resume: { turnId: paused.pause.turnId, decisions },
  };
}

/** Whether the server has dropped the pause by now (15 min after it). */
export function pauseExpired(
  paused: PausedTurn<unknown>,
  now: number,
): boolean {
  return now >= paused.pause.expiresAt;
}

/** The turn as it stays when it can no longer be resumed: still readable. */
export function expireTurn<Request>(
  paused: PausedTurn<Request>,
): PausedTurn<Request> {
  return { ...paused, steps: expirePending(paused.steps) };
}

/** The reply text before the pause and the text after the resume, joined. */
export function joinReplyText(before: string, after: string): string {
  const head = before.trimEnd();
  const tail = after.trimStart();
  if (!head) return tail;
  if (!tail) return head;
  return `${head}\n\n${tail}`;
}
