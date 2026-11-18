import type { UserAnswer } from "../ask-user.ts";
import type { ApprovalDecision } from "../tool-definition.ts";
import {
  expirePending,
  markPending,
  type LiveToolStep,
} from "./live-tool-steps.ts";
import type { ClientDecision, ToolTurnRequest } from "./tool-route.ts";
import type { ApprovalPause } from "./tool-stream-events.ts";

export type DecisionChoice = ApprovalDecision["decision"];

/** The user's answer to one ask_user call of the pause. */
export type AskUserReply = { callId: string; answer: UserAnswer };

/** What the user did with a pause: a choice for all calls, or an answer. */
export type PauseReply = DecisionChoice | AskUserReply;

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

/**
 * The decisions for a pause the user answered: the answered call goes back
 * with its answer, and every other call of the pause is denied, so nothing
 * runs that the user did not see. A skip ("deny") denies them all.
 */
export function replyDecisions(
  pause: ApprovalPause,
  reply: PauseReply,
): ClientDecision[] {
  if (typeof reply === "string") return decisionsFor(pause, reply);
  return pause.calls.map((call) =>
    call.callId === reply.callId
      ? {
          callId: call.callId,
          decision: "once",
          argsDigest: call.argsDigest,
          answer: reply.answer,
        }
      : { callId: call.callId, decision: "deny", argsDigest: call.argsDigest },
  );
}

/** The ask_user call the pause waits on, if any: the card answers it. */
export function askCallOf(pause: ApprovalPause) {
  return pause.calls.find((call) => call.ask) ?? null;
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
