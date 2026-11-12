import type { ApprovalDecision } from "../tool-definition.ts";

export const STREAM_ROUTE = "/api/chat/stream";
export const TOOLS_ROUTE = "/api/chat/tools";

/** A user's decision, bound to the digest the server sent with the call. */
export type ClientDecision = ApprovalDecision & { argsDigest: string };

export type ResumeBody = { turnId: string; decisions: ClientDecision[] };

/**
 * A turn sent through the tool route: the bot that opted in, and on a
 * resume the paused turn with the user's decisions.
 */
export type ToolTurnRequest = { botId: string; resume?: ResumeBody };

/**
 * Whether a turn may use tools: only a single bot that opted in. A crew turn
 * (the Chief or a specialist it asked) never does in v1.
 */
export function toolTurnFor(
  bot: { id: string; toolsEnabled?: boolean },
  crew: boolean,
): ToolTurnRequest | undefined {
  return !crew && bot.toolsEnabled === true ? { botId: bot.id } : undefined;
}

/** The route for a streamed turn: the tool route only for an opted-in bot. */
export function streamRouteFor(tools: ToolTurnRequest | undefined): string {
  return tools ? TOOLS_ROUTE : STREAM_ROUTE;
}

/** The fields the tool route reads, added to the plain chat request body. */
export function toolRequestFields(
  tools: ToolTurnRequest | undefined,
): Record<string, unknown> {
  if (!tools) return {};
  return {
    botId: tools.botId,
    toolsEnabled: true,
    ...(tools.resume ? { resume: tools.resume } : {}),
  };
}
