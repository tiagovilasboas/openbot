import {
  MAX_ATTACHMENTS,
  MAX_NAME_LENGTH,
  MAX_TOTAL_CHARS,
} from "./attachment-limits.ts";

/** What the device sends for a file: its name and the text it read. */
export interface AttachmentPayload {
  name: string;
  text: string;
}

export type ParsedAttachments =
  { ok: true; attachments: AttachmentPayload[] } | { ok: false };

function isPayload(value: unknown): value is AttachmentPayload {
  if (typeof value !== "object" || value === null) return false;
  const { name, text } = value as Record<string, unknown>;
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    name.length <= MAX_NAME_LENGTH &&
    typeof text === "string" &&
    text.trim().length > 0 &&
    text.length <= MAX_TOTAL_CHARS
  );
}

/**
 * Validates the optional `attachments` of a chat request. Anything out of
 * shape or over a limit rejects the whole request: the device already cuts
 * files to fit, so an honest client never trips these caps. Only name and
 * text are kept, whatever else the client sent.
 */
export function parseAttachments(raw: unknown): ParsedAttachments {
  if (raw === undefined) return { ok: true, attachments: [] };
  if (!Array.isArray(raw) || raw.length > MAX_ATTACHMENTS) return { ok: false };
  if (!raw.every(isPayload)) return { ok: false };
  const total = raw.reduce((sum, item) => sum + item.text.length, 0);
  if (total > MAX_TOTAL_CHARS) return { ok: false };
  return {
    ok: true,
    attachments: raw.map(({ name, text }) => ({ name, text })),
  };
}
