const MAX_LINE_LENGTH = 1_000_000;
/** Bytes and lines read from one upstream body before it is cut off. */
export const MAX_STREAM_BYTES = 16_000_000;
export const MAX_STREAM_LINES = 1_000_000;

export type StreamLimits = {
  maxBytes?: number;
  maxLines?: number;
  maxLineLength?: number;
};

/** The upstream sent more than a reply can plausibly need. */
export class StreamTooLargeError extends Error {
  readonly reason: "bytes" | "lines" | "line_length";

  constructor(reason: StreamTooLargeError["reason"]) {
    super(`stream too large: ${reason}`);
    this.name = "StreamTooLargeError";
    this.reason = reason;
  }
}

/**
 * Splits a response body into text lines. Both server-sent events and NDJSON
 * are line based, so every provider parser sits on top of this. Cancelling the
 * body when the consumer stops (or aborts) releases the upstream connection.
 * Total bytes, total lines and one line's length are capped; going over throws
 * a StreamTooLargeError, so a hostile upstream cannot stream newline-only or
 * endless output for the whole deadline.
 */
export async function* readLines(
  body: ReadableStream<Uint8Array>,
  limits: StreamLimits = {},
): AsyncGenerator<string> {
  const maxBytes = limits.maxBytes ?? MAX_STREAM_BYTES;
  const maxLines = limits.maxLines ?? MAX_STREAM_LINES;
  const maxLineLength = limits.maxLineLength ?? MAX_LINE_LENGTH;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let bytes = 0;
  let lines = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new StreamTooLargeError("bytes");
      buffer += decoder.decode(value, { stream: true });
      let index = buffer.indexOf("\n");
      while (index >= 0) {
        lines += 1;
        if (lines > maxLines) throw new StreamTooLargeError("lines");
        yield buffer.slice(0, index).replace(/\r$/, "");
        buffer = buffer.slice(index + 1);
        index = buffer.indexOf("\n");
      }
      if (buffer.length > maxLineLength) {
        throw new StreamTooLargeError("line_length");
      }
    }
    buffer += decoder.decode();
    if (buffer) yield buffer.replace(/\r$/, "");
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

/** The payload of an SSE `data:` line, or null for any other line. */
export function sseData(line: string): string | null {
  return line.startsWith("data:") ? line.slice(5).trimStart() : null;
}

/** A JSON object from one line, or null when it is not one. */
export function parseJsonLine(line: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(line);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

export function tokenCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}
