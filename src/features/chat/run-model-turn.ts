import { raceCancel } from "./cancel-turn.ts";
import { cancelledPartialReply } from "./cancelled-partial-reply.ts";
import { chatCopy } from "./chat-copy.ts";
import type { ChatReplyOutcome } from "./chat-reply-outcome.ts";
import type { ExecuteChatMessageInput } from "./execute-chat-message-input.ts";
import { executeChatMessage } from "./execute-chat-message.ts";
import type { LiveTurn } from "./live-turn.ts";

/** What the caller supplies; the live turn wires in the rest. */
type ModelTurnRequest = Omit<
  ExecuteChatMessageInput,
  "onLive" | "onToolSteps" | "signal"
>;

/**
 * Asks for the reply to one message while the live turn shows its progress,
 * then ends the live turn. A cancel stores what had arrived, or a note.
 */
export async function runModelTurn(
  turn: LiveTurn,
  request: ModelTurnRequest,
): Promise<{ reply: ChatReplyOutcome; cancelled: boolean }> {
  const result = await raceCancel(
    turn.signal,
    executeChatMessage({
      ...request,
      onLive: turn.live,
      onToolSteps: turn.steps,
      signal: turn.signal,
    }),
  );
  turn.end();
  if (result !== "cancelled") return { reply: result, cancelled: false };
  return {
    reply: cancelledPartialReply(turn.latest()) ?? {
      text: chatCopy[request.language].cancelledNote,
    },
    cancelled: true,
  };
}
