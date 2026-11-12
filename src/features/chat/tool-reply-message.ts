import type { MessageData } from "./ChatMessageItem.tsx";
import type { ToolTurnReply } from "./tool-turn-reply.ts";

/**
 * The thread with one tool turn's message brought up to date after a resume:
 * its text, steps, partial mark and failover are the new ones. A thread that
 * no longer holds the message (rolled back, cleared) is returned unchanged.
 */
export function settleToolReply(
  thread: readonly MessageData[],
  messageId: number,
  reply: ToolTurnReply,
): MessageData[] {
  return thread.map((message) => {
    if (message.id !== messageId || message.role !== "assistant") {
      return message;
    }
    const kept: MessageData = { ...message, text: reply.text };
    delete kept.toolSteps;
    delete kept.incomplete;
    delete kept.failover;
    return {
      ...kept,
      ...(reply.toolSteps?.length ? { toolSteps: reply.toolSteps } : {}),
      ...(reply.incomplete ? { incomplete: reply.incomplete } : {}),
      ...(reply.failover ? { failover: reply.failover } : {}),
    };
  });
}
