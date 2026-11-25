import type { AskUserPrompt } from "./ask-user.ts";
import type { ToolLoopEvent } from "./tool-loop-types.ts";

/** A call shown on the approval card; argsDigest comes back with the decision. */
export type ApprovalCall = {
  callId: string;
  name: string;
  preview: string;
  argsDigest: string;
  allowAlways: boolean;
  /** Set on an ask_user call: the question the card shows. */
  ask?: AskUserPrompt;
};

/** A turn stopped for the user: these calls wait until expiresAt. */
export type ToolPause = {
  turnId: string;
  calls: ApprovalCall[];
  expiresAt: number;
};

/**
 * Wire format of POST /api/chat/tools: the /api/chat/stream events plus the
 * tool events. A turn ends with exactly one of done, error or
 * approval_required; tools_unavailable may come first when the model takes
 * no tools and the turn runs as plain chat.
 */
export type ToolTurnEvent =
  | ToolLoopEvent
  | ({ type: "approval_required" } & ToolPause)
  | { type: "tools_unavailable" };
