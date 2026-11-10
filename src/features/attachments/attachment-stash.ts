import type { AttachmentPayload } from "./parse-attachments.ts";

/**
 * The text of files sent in this session, so "retry" can send the same file
 * again. It lives in memory only: the text is never stored with the message,
 * so after a reload a retry goes without it.
 */
const stash = new Map<string, AttachmentPayload[]>();

const keyOf = (botId: string, messageId: number) => `${botId}:${messageId}`;

/** Remembers the files of a message; no files forgets any old entry. */
export function rememberAttachments(
  botId: string,
  messageId: number,
  files: readonly AttachmentPayload[],
): void {
  if (files.length === 0) stash.delete(keyOf(botId, messageId));
  else stash.set(keyOf(botId, messageId), [...files]);
}

/** The files remembered for a message, or none. */
export function recallAttachments(
  botId: string,
  messageId: number,
): AttachmentPayload[] {
  return stash.get(keyOf(botId, messageId)) ?? [];
}
