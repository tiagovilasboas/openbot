import { MAX_BODY_BYTES } from "../server-guard/check-body-size.ts";
import type { AttachmentPayload } from "./parse-attachments.ts";

/**
 * Room kept in the 64 KB request body for what the files do not control: the
 * envelope, the system prompt (12000 characters at most, which can be up to
 * 36 KB if every character takes three bytes, but is about 13 KB in practice),
 * the bot's memory (4000) and the model settings.
 */
export const RESERVED_REQUEST_BYTES = 24_000;

/** Bytes of a value as JSON on the wire. */
export function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function attachmentBytes(attachments: readonly AttachmentPayload[]): number {
  if (attachments.length === 0) return 0;
  return jsonBytes(attachments.map(({ name, text }) => ({ name, text })));
}

/** Bytes left for the conversation history once the files are counted. */
export function historyByteBudget(
  attachments: readonly AttachmentPayload[],
): number {
  return Math.max(
    0,
    MAX_BODY_BYTES - RESERVED_REQUEST_BYTES - attachmentBytes(attachments),
  );
}

/**
 * Whether the message and its files can travel in one request. The history
 * is trimmed to the rest, so only these two can make a request too big.
 */
export function messageFitsRequest(
  text: string,
  attachments: readonly AttachmentPayload[],
): boolean {
  return jsonBytes(text) <= historyByteBudget(attachments);
}
