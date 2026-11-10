const MAX_LINE_LENGTH = 1_000_000;

/**
 * Splits a response body into text lines. Both server-sent events and NDJSON
 * are line based, so every provider parser sits on top of this. Cancelling the
 * body when the consumer stops (or aborts) releases the upstream connection.
 */
export async function* readLines(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index = buffer.indexOf("\n");
      while (index >= 0) {
        yield buffer.slice(0, index).replace(/\r$/, "");
        buffer = buffer.slice(index + 1);
        index = buffer.indexOf("\n");
      }
      if (buffer.length > MAX_LINE_LENGTH) {
        throw new Error("stream line too long");
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
