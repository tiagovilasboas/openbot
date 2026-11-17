import type { MessageData } from "./ChatMessageItem.tsx";
import type { ChatReplyOutcome } from "./chat-reply-outcome.ts";
import { buildReplyMessages } from "./reply-messages.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { insertReplyAfter } from "./thread-sequencing.ts";

interface TurnReplyToStore {
  reply: ChatReplyOutcome;
  language: ChatLanguage;
  modelBadge: string | undefined;
  getNextId: () => number;
  /** The thread as stored now; the reply goes right after the message. */
  thread: MessageData[];
  userMessageId: number;
  persistMessages: (messages: MessageData[]) => void;
}

/** Stores the reply after the message it answers; returns what it stored. */
export function storeTurnReply({
  reply,
  language,
  modelBadge,
  getNextId,
  thread,
  userMessageId,
  persistMessages,
}: TurnReplyToStore): MessageData[] {
  const replyMessages = buildReplyMessages(reply, {
    language,
    modelBadge,
    nextId: getNextId,
  });
  persistMessages(insertReplyAfter(thread, userMessageId, replyMessages));
  return replyMessages;
}
