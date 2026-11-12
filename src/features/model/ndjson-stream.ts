import type { ChatStreamEvent } from "./stream-events.ts";

/**
 * Turns the event generator into an NDJSON byte stream, one event per line.
 * Reading is pull-based, so a slow client slows the upstream read instead of
 * buffering it. When the client goes away, `onCancel` aborts the upstream call.
 */
export function eventsToNdjson<E = ChatStreamEvent>(
  events: AsyncGenerator<E>,
  onCancel: () => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const line = (event: E | ChatStreamEvent) =>
    encoder.encode(`${JSON.stringify(event)}\n`);

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await events.next();
        if (next.done) controller.close();
        else controller.enqueue(line(next.value));
      } catch {
        // The generator reports failures as events; this is a last resort.
        controller.enqueue(
          line({ type: "error", code: "unknown", provider: null }),
        );
        controller.close();
      }
    },
    cancel() {
      onCancel();
      void events.return(undefined).catch(() => undefined);
    },
  });
}
