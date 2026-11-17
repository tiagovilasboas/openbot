import { rememberAttachments } from "@/features/attachments/attachment-stash.ts";
import {
  toPayloads,
  toSummaries,
} from "@/features/attachments/attachment-summary.ts";
import type { AttachmentPayload } from "@/features/attachments/parse-attachments.ts";
import type { Attachment } from "@/features/attachments/read-attachment.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

interface UserMessageToStore {
  botId: string;
  id: number;
  clientId: string;
  language: ChatLanguage;
  text: string;
  files: Attachment[];
  /** The thread as stored now; the message goes after it. */
  thread: MessageData[];
  persistMessages: (messages: MessageData[]) => void;
}

/**
 * Stores the user's message at the end of the thread and keeps its files in
 * memory for a retry. Returns the files as the request carries them.
 */
export function storeUserMessage({
  botId,
  id,
  clientId,
  language,
  text,
  files,
  thread,
  persistMessages,
}: UserMessageToStore): AttachmentPayload[] {
  const attachments = toPayloads(files);
  rememberAttachments(botId, id, attachments);
  const userMessage: MessageData = {
    id,
    role: "user",
    clientId,
    language,
    text,
    ...(files.length > 0 ? { attachments: toSummaries(files) } : {}),
  };
  persistMessages([...thread, userMessage]);
  return attachments;
}
