import { MAX_ATTACHMENTS, MAX_TOTAL_CHARS } from "./attachment-limits.ts";
import {
  readAttachment,
  type AttachableFile,
  type Attachment,
  type AttachmentRejection,
} from "./read-attachment.ts";

export interface RejectedFile {
  name: string;
  reason: AttachmentRejection;
}

export interface AddAttachmentsResult {
  /** The files kept so far: the ones already there plus the new ones. */
  attachments: Attachment[];
  rejected: RejectedFile[];
}

/** Characters of file text a message may still take. */
export function remainingChars(attachments: readonly Attachment[]): number {
  const used = attachments.reduce((sum, a) => sum + a.chars, 0);
  return Math.max(0, MAX_TOTAL_CHARS - used);
}

/**
 * Reads the chosen files one by one, in order, onto the ones already
 * attached. A file that does not fit the count or the character budget is
 * rejected; the rest still go in.
 */
export async function addAttachmentFiles(
  current: readonly Attachment[],
  files: readonly AttachableFile[],
): Promise<AddAttachmentsResult> {
  const attachments = [...current];
  const rejected: RejectedFile[] = [];
  for (const file of files) {
    if (attachments.length >= MAX_ATTACHMENTS) {
      rejected.push({ name: file.name, reason: "too_many" });
      continue;
    }
    const result = await readAttachment(file, remainingChars(attachments));
    if (result.ok) attachments.push(result.attachment);
    else rejected.push({ name: file.name, reason: result.reason });
  }
  return { attachments, rejected };
}
