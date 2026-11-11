import type { Language } from "../language/language.ts";
import type { AttachmentPayload } from "./parse-attachments.ts";
import type { Attachment } from "./read-attachment.ts";

/**
 * What a stored message remembers about a file it was sent with: the name
 * and size only. The file's text is never stored.
 */
export interface AttachmentSummary {
  name: string;
  size: number;
  truncated?: boolean;
}

/** The raw name and text the chat request carries. */
export function toPayloads(attachments: readonly Attachment[]) {
  return attachments.map(({ name, text }): AttachmentPayload => ({
    name,
    text,
  }));
}

/** The metadata kept on the stored message. */
export function toSummaries(
  attachments: readonly Attachment[],
): AttachmentSummary[] {
  return attachments.map(({ name, size, truncated }) => ({
    name,
    size,
    ...(truncated ? { truncated } : {}),
  }));
}

/** "812 B", "4.2 KB" or "4,2 KB" (Portuguese only) for a size in bytes. */
export function formatFileSize(bytes: number, language: Language): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  const text = kb < 10 ? kb.toFixed(1) : String(Math.round(kb));
  return `${language === "pt" ? text.replace(".", ",") : text} KB`;
}
