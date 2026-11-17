export type StreamReplayResult =
  | { kind: "response"; response: Response; replayed: boolean }
  | { kind: "conflict" };

type Status = "running" | "done" | "failed" | "oversize";

type Entry = {
  fingerprint: string;
  expiresAt: number;
  status: Status;
  headers: Headers;
  chunks: Uint8Array[];
  bytes: number;
  wake: Set<() => void>;
};

export type StreamReplayOptions = {
  ttlMs?: number;
  maxEntries?: number;
  /** Most bytes kept for one stream; a longer stream is simply not stored. */
  maxEntryBytes?: number;
  /** How long a sharer waits for the next line before it gives up. */
  followIdleMs?: number;
  now?: () => number;
};

const decoder = new TextDecoder();

function lineType(chunk: Uint8Array | undefined): unknown {
  if (!chunk) return undefined;
  try {
    const event: unknown = JSON.parse(decoder.decode(chunk));
    return typeof event === "object" && event !== null
      ? (event as { type?: unknown }).type
      : undefined;
  } catch {
    return undefined;
  }
}

/** A finished reply ends with a `done` event; an `error` line is a failure. */
const isDoneLine = (chunk: Uint8Array | undefined) =>
  lineType(chunk) === "done";

/** `done` and `error` close a stream; after either, nothing more is owed. */
function isTerminalLine(chunk: Uint8Array | undefined): boolean {
  const type = lineType(chunk);
  return type === "done" || type === "error";
}

const encoder = new TextEncoder();

/** The closing line a sharer gets when the stream it follows did not finish. */
const errorLine = (code: "unknown" | "timeout") =>
  encoder.encode(
    `${JSON.stringify({ type: "error", code, provider: null })}\n`,
  );

/**
 * Remembers successful NDJSON streams per send id for a short time, so a
 * repeated send replays the stored lines instead of calling the model again.
 * A request that arrives while the first stream runs reads the lines seen so
 * far, then the live ones; if that stream does not finish, the sharer's copy
 * ends with an `error` line. Failed, cancelled and oversized streams are never
 * kept. In-memory: stored streams are bounded by TTL, entry count and bytes
 * per entry; running ones by the stream slots of the handler.
 */
export function createStreamReplay(options: StreamReplayOptions = {}) {
  const ttlMs = options.ttlMs ?? 10 * 60_000;
  const maxEntries = options.maxEntries ?? 100;
  const maxEntryBytes = options.maxEntryBytes ?? 512 * 1024;
  const followIdleMs = options.followIdleMs ?? 60_000;
  const now = options.now ?? Date.now;
  const entries = new Map<string, Entry>();

  function prune() {
    const t = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= t) entries.delete(key);
    }
    // Insertion order: the oldest settled entries go first.
    for (const [key, entry] of entries) {
      if (entries.size < maxEntries) break;
      if (entry.status === "done") entries.delete(key);
    }
  }

  function notify(entry: Entry) {
    const wake = [...entry.wake];
    entry.wake.clear();
    for (const fn of wake) fn();
  }

  function settle(key: string, entry: Entry, status: Status) {
    if (entry.status !== "running") return;
    entry.status = status;
    if (status === "done") {
      entry.expiresAt = now() + ttlMs;
    } else if (entries.get(key) === entry) {
      // Sharers still read the lines seen so far; the table forgets it now.
      entries.delete(key);
    }
    notify(entry);
  }

  /**
   * Lines already seen, then the live ones. A stream that failed, was
   * cancelled, grew past the cap or went quiet for too long ends here with an
   * `error` line, so the reader never takes a cut reply for a whole one.
   */
  function follow(entry: Entry): ReadableStream<Uint8Array> {
    let index = 0;
    let stopWaiting = () => {};
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        for (;;) {
          const chunk = entry.chunks[index];
          if (chunk) {
            index += 1;
            controller.enqueue(chunk);
            return;
          }
          if (entry.status !== "running") {
            const last = entry.chunks[entry.chunks.length - 1];
            if (!isTerminalLine(last)) controller.enqueue(errorLine("unknown"));
            controller.close();
            return;
          }
          const woken = await new Promise<boolean>((resolve) => {
            const wake = () => {
              clearTimeout(timer);
              resolve(true);
            };
            const timer = setTimeout(() => {
              entry.wake.delete(wake);
              resolve(false);
            }, followIdleMs);
            stopWaiting = () => {
              clearTimeout(timer);
              entry.wake.delete(wake);
            };
            entry.wake.add(wake);
          });
          if (!woken) {
            controller.enqueue(errorLine("timeout"));
            controller.close();
            return;
          }
        }
      },
      cancel() {
        stopWaiting();
      },
    });
  }

  /** The first request's body: records each line while passing it on. */
  function record(
    key: string,
    entry: Entry,
    source: ReadableStream<Uint8Array>,
  ): ReadableStream<Uint8Array> {
    const reader = source.getReader();
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const next = await reader.read();
          if (next.done) {
            const done = isDoneLine(entry.chunks[entry.chunks.length - 1]);
            settle(key, entry, done ? "done" : "failed");
            controller.close();
            return;
          }
          if (entry.status === "running") {
            entry.bytes += next.value.byteLength;
            if (entry.bytes > maxEntryBytes) settle(key, entry, "oversize");
            else {
              entry.chunks.push(next.value);
              notify(entry);
            }
          }
          controller.enqueue(next.value);
        } catch (error) {
          settle(key, entry, "failed");
          controller.error(error);
        }
      },
      cancel(reason) {
        settle(key, entry, "failed");
        return reader.cancel(reason);
      },
    });
  }

  /**
   * `start` runs only when the id is new; it must start the stream
   * synchronously. A reply that is not an NDJSON body (a plain error status)
   * is passed through and not remembered.
   */
  function run(
    key: string,
    fingerprint: string,
    start: () => Response,
  ): StreamReplayResult {
    prune();
    const existing = entries.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) return { kind: "conflict" };
      return {
        kind: "response",
        response: new Response(follow(existing), { headers: existing.headers }),
        replayed: true,
      };
    }

    const response = start();
    if (!response.ok || !response.body) {
      return { kind: "response", response, replayed: false };
    }
    // Running streams count too; a full table serves the stream uncached.
    if (entries.size >= maxEntries) {
      return { kind: "response", response, replayed: false };
    }
    const entry: Entry = {
      fingerprint,
      // A stream nobody finishes reading is dropped after the same TTL.
      expiresAt: now() + ttlMs,
      status: "running",
      headers: new Headers(response.headers),
      chunks: [],
      bytes: 0,
      wake: new Set(),
    };
    entries.set(key, entry);
    return {
      kind: "response",
      response: new Response(record(key, entry, response.body), {
        status: response.status,
        headers: response.headers,
      }),
      replayed: false,
    };
  }

  return { run, size: () => entries.size };
}

/** Shared by the streaming chat route for the life of the server. */
export const chatStreamReplay = createStreamReplay();
