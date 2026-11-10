import type { ChatStreamEvent } from "../../features/model/stream-events.ts";

export type FakeBodyOptions = {
  /** The request signal the fake upstream honours, like a real fetch. */
  signal?: AbortSignal | null;
  /** Keep the body open after the chunks, until the signal aborts. */
  hang?: boolean;
  /** Error the body after the chunks, like a dropped connection. */
  reset?: boolean;
};

/** A response body that emits the given text chunks, then ends as asked. */
export function fakeBody(
  chunks: string[],
  options: FakeBodyOptions = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      options.signal?.addEventListener("abort", () => {
        try {
          controller.error(new DOMException("aborted", "AbortError"));
        } catch {
          // already closed
        }
      });
      if (!options.reset && !options.hang) controller.close();
    },
    // Runs once the queued chunks were read: erroring earlier would drop them.
    pull(controller) {
      if (options.reset) controller.error(new Error("socket reset"));
    },
  });
}

export function streamResponse(
  chunks: string[],
  options: FakeBodyOptions = {},
): Response {
  return new Response(fakeBody(chunks, options), {
    headers: { "content-type": "text/event-stream" },
  });
}

/** OpenAI-compatible SSE lines for the given text pieces. */
export function routerSse(
  pieces: string[],
  extra: { usage?: { prompt_tokens: number; completion_tokens: number } } = {},
): string[] {
  return [
    ...pieces.map(
      (text) =>
        `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
    ),
    `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }], ...extra })}\n\n`,
    "data: [DONE]\n\n",
  ];
}

/** Reads every NDJSON event of a stream response. */
export async function readEvents(
  response: Response,
): Promise<ChatStreamEvent[]> {
  const text = await response.text();
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ChatStreamEvent);
}
