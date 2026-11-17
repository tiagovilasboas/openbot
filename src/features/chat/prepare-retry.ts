import { recallAttachments } from "@/features/attachments/attachment-stash.ts";
import type { AttachmentPayload } from "@/features/attachments/parse-attachments.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import { dropRepliesTo } from "./retry-partial-reply.ts";

interface RetryTurn {
  text: string;
  id: number;
  attachments: AttachmentPayload[];
}

/**
 * Readies the retry of a user message left without a full reply: a partial
 * reply is removed from the stored thread, and the message is returned with
 * the files still in memory. Undefined when the message is not in the thread.
 */
export function prepareRetry(
  stored: MessageData[],
  userMessageId: number,
  botId: string,
  persistMessages: (messages: MessageData[]) => void,
): RetryTurn | undefined {
  const message = stored.find(
    (m) => m.id === userMessageId && m.role === "user",
  );
  if (!message) return undefined;
  // A partial reply is replaced by the new answer, not kept beside it.
  const rest = dropRepliesTo(stored, userMessageId);
  if (rest.length !== stored.length) persistMessages(rest);
  // The file text is not stored: a retry sends it only while it is still
  // in memory from this session.
  return {
    text: message.text,
    id: message.id,
    attachments: message.attachments?.length
      ? recallAttachments(botId, message.id)
      : [],
  };
}
