import assert from "node:assert/strict";
import test from "node:test";
import type { ModelRequest } from "./model-adapter.ts";
import type {
  ModelStreamChunk,
  ModelStreamOpen,
  StreamingModelAdapter,
} from "./stream-adapter.ts";
import type { ChatStreamEvent } from "./stream-events.ts";
import { createStreamSignal } from "./stream-signal.ts";
import { streamWithFailover } from "./stream-with-failover.ts";

const request: ModelRequest = {
  language: "en",
  messages: [{ role: "user", text: "hi" }],
};

function adapter(
  model: string,
  open: (signal?: AbortSignal) => Promise<ModelStreamOpen>,
): StreamingModelAdapter {
  return {
    provider: "local",
    model,
    generateReply: async () => {
      throw new Error("not used");
    },
    streamReply: (_request, signal) => open(signal),
  };
}

async function* chunks(...items: ModelStreamChunk[]) {
  yield* items;
}

const opened = (...items: ModelStreamChunk[]): ModelStreamOpen => ({
  ok: true,
  provider: "local",
  chunks: chunks(...items),
});

async function run(
  primary: StreamingModelAdapter,
  fallback: StreamingModelAdapter | null,
  signal: AbortSignal = new AbortController().signal,
) {
  const events: ChatStreamEvent[] = [];
  for await (const event of streamWithFailover({
    request,
    primary,
    fallback,
    signal,
  })) {
    events.push(event);
  }
  return events;
}

test("usage from several chunks is merged without losing earlier counts", async () => {
  const events = await run(
    adapter("m", async () =>
      opened(
        { type: "usage", usage: { inputTokens: 5, outputTokens: 1 } },
        { type: "delta", text: "a" },
        { type: "usage", usage: { inputTokens: undefined, outputTokens: 8 } },
      ),
    ),
    null,
  );
  assert.deepEqual(events.at(-1), {
    type: "done",
    provider: "local",
    model: "m",
    usage: { inputTokens: 5, outputTokens: 8 },
  });
});

test("without a fallback, the primary's failure is the final error", async () => {
  const events = await run(
    adapter("m", async () => ({
      ok: false,
      code: "provider_rejected",
      provider: "local",
      detail: "401: unauthorized",
    })),
    null,
  );
  assert.deepEqual(events, [
    { type: "error", code: "auth", provider: "local", status: 401 },
  ]);
});

test("the fallback is not tried once the primary produced text", async () => {
  let fallbackOpened = false;
  const events = await run(
    adapter("a", async () =>
      opened(
        { type: "delta", text: "x" },
        { type: "failed", code: "provider_unreachable" },
      ),
    ),
    adapter("b", async () => {
      fallbackOpened = true;
      return opened({ type: "delta", text: "y" });
    }),
  );
  assert.equal(fallbackOpened, false);
  assert.deepEqual(events.at(-1), {
    type: "error",
    code: "unreachable",
    provider: "local",
  });
});

test("the overall deadline ends a hung stream with a timeout error", async () => {
  const signal = createStreamSignal([], 20);
  // AbortSignal.timeout timers are unref'd; keep the loop alive for the test.
  const keepAlive = setTimeout(() => undefined, 2000);
  const events = await run(
    adapter("m", async (upstream) => ({
      ok: true,
      provider: "local",
      chunks: (async function* () {
        yield { type: "delta", text: "x" } as const;
        await new Promise((resolve) =>
          upstream?.addEventListener("abort", resolve),
        );
      })(),
    })),
    null,
    signal,
  );
  clearTimeout(keepAlive);
  assert.deepEqual(events.at(-1), {
    type: "error",
    code: "timeout",
    provider: null,
  });
});

test("a client abort during the first wait ends the stream without events", async () => {
  const client = new AbortController();
  const events = await run(
    adapter("m", async (upstream) => {
      client.abort();
      assert.equal(upstream?.aborted, true);
      return { ok: false, code: "provider_unreachable", provider: "local" };
    }),
    adapter("b", async () => opened({ type: "delta", text: "never" })),
    createStreamSignal([client.signal]),
  );
  assert.deepEqual(events, []);
});
