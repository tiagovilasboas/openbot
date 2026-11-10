import { MAX_FILE_BYTES, MAX_TOTAL_CHARS } from "./attachment-limits.ts";
import {
  cutText,
  decodeUtf8Strict,
  stripStrayControls,
} from "./decode-text.ts";
import { looksLikeTextFile } from "./text-file-kind.ts";

/** A file read on the device. `text` is what may be sent; `size` is bytes. */
export interface Attachment {
  name: string;
  text: string;
  truncated: boolean;
  chars: number;
  size: number;
}

export type AttachmentRejection =
  "too_large" | "not_text" | "unreadable" | "too_many" | "empty";

export type ReadAttachmentResult =
  | { ok: true; attachment: Attachment }
  | { ok: false; reason: AttachmentRejection };

/** The slice of `File` the reader needs, so tests need no browser. */
export interface AttachableFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * Reads a text file on the device and cuts it to what is left of the
 * message's character budget. Nothing leaves the device here.
 */
export async function readAttachment(
  file: AttachableFile,
  remainingChars: number = MAX_TOTAL_CHARS,
): Promise<ReadAttachmentResult> {
  if (remainingChars <= 0) return { ok: false, reason: "too_many" };
  if (!looksLikeTextFile(file.name, file.type)) {
    return { ok: false, reason: "not_text" };
  }
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: "too_large" };

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  const decoded = decodeUtf8Strict(bytes);
  if (decoded === null) return { ok: false, reason: "not_text" };

  const full = stripStrayControls(decoded);
  if (full.trim() === "") return { ok: false, reason: "empty" };
  const text = cutText(full, Math.min(remainingChars, MAX_TOTAL_CHARS));
  return {
    ok: true,
    attachment: {
      name: file.name,
      text,
      truncated: text.length < full.length,
      chars: text.length,
      size: file.size,
    },
  };
}
