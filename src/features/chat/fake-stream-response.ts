/** What a fake NDJSON body does next: send text, fail, or stall until abort. */
export type FakeChunk = string | Error | "stall";

/** Events as the NDJSON lines the stream route would write. */
export function ndjson(...events: object[]): string {
  return events.map((event) => `${JSON.stringify(event)}\n`).join("");
}

/**
 * A streamed Response for tests. Each chunk is one read; "stall" waits until
 * the request is aborted and then errors the body, like a browser does.
 */
export function fakeStreamResponse(
  chunks: FakeChunk[],
  signal?: AbortSignal | null,
  init: { status?: number; contentType?: string } = {},
): Response {
  const queue = [...chunks];
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = queue.shift();
      if (next === undefined) return controller.close();
      if (next instanceof Error) return controller.error(next);
      if (next === "stall") {
        await new Promise<void>((resolve) => {
          if (signal?.aborted) resolve();
          signal?.addEventListener("abort", () => resolve(), { once: true });
        });
        return controller.error(new DOMException("aborted", "AbortError"));
      }
      controller.enqueue(encoder.encode(next));
    },
  });
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      "content-type": init.contentType ?? "application/x-ndjson; charset=utf-8",
    },
  });
}
