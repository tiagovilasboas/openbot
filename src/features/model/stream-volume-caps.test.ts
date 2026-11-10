import assert from "node:assert/strict";
import test from "node:test";
import {
  fakeBody,
  readEvents,
  routerSse,
  streamResponse,
} from "../../shared/testing/stream-fixtures.ts";
import type { FetchLike, ModelRequest } from "./model-adapter.ts";
import { fitReplyChunk } from "./reply-limit.ts";
import type {
  ModelStreamChunk,
  StreamingModelAdapter,
} from "./stream-adapter.ts";
import { handleChatStream } from "./stream-chat-handler.ts";
import type { ChatStreamEvent } from "./stream-events.ts";
import { readLines, StreamTooLargeError } from "./stream-lines.ts";
import { streamWithFailover } from "./stream-with-failover.ts";
import { createStreamSlots } from "../server-guard/stream-slots.ts";

async function drain(body: ReadableStream<Uint8Array>, limits = {}) {
  const lines: string[] = [];
  for await (const line of readLines(body, limits)) lines.push(line);
  return lines;
}

async function reasonOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof StreamTooLargeError, String(error));
    return error.reason;
  }
  return "no error";
}

test("readLines stops a body with too many bytes", async () => {
  const chunks = Array.from({ length: 20 }, () => "x".repeat(1_000) + "\n");
  assert.equal(
    await reasonOf(drain(fakeBody(chunks), { maxBytes: 5_000 })),
    "bytes",
  );
  assert.equal(
    (await drain(fakeBody(chunks), { maxBytes: 20_100 })).length,
    20,
  );
});

test("readLines stops many short lines and newline-only lines", async () => {
  const short = Array.from({ length: 500 }, () => "a\n");
  assert.equal(
    await reasonOf(drain(fakeBody(short), { maxLines: 100 })),
    "lines",
  );
  assert.equal(
    await reasonOf(drain(fakeBody(["\n".repeat(5_000)]), { maxLines: 100 })),
    "lines",
  );
  assert.equal((await drain(fakeBody(short), { maxLines: 500 })).length, 500);
});

test("readLines still caps one endless line", async () => {
  assert.equal(
    await reasonOf(
      drain(fakeBody(["x".repeat(3_000)]), { maxLineLength: 1_000 }),
    ),
    "line_length",
  );
});

test("fitReplyChunk keeps what fits and never splits a surrogate pair", () => {
  assert.deepEqual(fitReplyChunk(0, "abc", 10), {
    text: "abc",
    exceeded: false,
  });
  assert.deepEqual(fitReplyChunk(8, "abcdef", 10), {
    text: "ab",
    exceeded: true,
  });
  assert.deepEqual(fitReplyChunk(10, "x", 10), { text: "", exceeded: true });
  const emoji = "a\u{1F600}";
  assert.deepEqual(fitReplyChunk(0, emoji, 2), { text: "a", exceeded: true });
});

const request: ModelRequest = {
  language: "en",
  messages: [{ role: "user", text: "hi" }],
};

function adapterOf(...deltas: string[]): StreamingModelAdapter {
  async function* chunks(): AsyncGenerator<ModelStreamChunk> {
    for (const text of deltas) yield { type: "delta", text };
  }
  return {
    provider: "local",
    model: "m",
    generateReply: async () => {
      throw new Error("not used");
    },
    streamReply: async () => ({
      ok: true,
      provider: "local",
      chunks: chunks(),
    }),
  };
}

async function run(adapter: StreamingModelAdapter, maxReplyChars: number) {
  const events: ChatStreamEvent[] = [];
  for await (const event of streamWithFailover({
    request,
    primary: adapter,
    signal: new AbortController().signal,
    maxReplyChars,
  })) {
    events.push(event);
  }
  return events;
}

const textOf = (events: ChatStreamEvent[]) =>
  events.map((e) => (e.type === "delta" ? e.text : "")).join("");

test("one huge delta is cut at the cap and ends with response_too_long", async () => {
  const events = await run(adapterOf("x".repeat(10_000)), 100);
  assert.equal(textOf(events).length, 100);
  assert.deepEqual(events.at(-1), {
    type: "error",
    code: "response_too_long",
    provider: "local",
  });
  assert.ok(!events.some((event) => event.type === "done"));
});

test("many short deltas end at the cap, not when the upstream stops", async () => {
  const events = await run(adapterOf(...Array(1_000).fill("0123456789")), 250);
  assert.equal(textOf(events).length, 250);
  assert.equal(events.at(-1)?.type, "error");
  assert.equal(events.filter((e) => e.type === "delta").length, 25);
});

test("a reply exactly at the cap is still done", async () => {
  const events = await run(adapterOf("x".repeat(60), "y".repeat(40)), 100);
  assert.equal(textOf(events).length, 100);
  assert.equal(events.at(-1)?.type, "done");
});

const envless = {};
const config = {
  provider: "router",
  baseUrl: "https://93.184.216.34/v1",
  model: "vendor/model",
};

function chatRequest(): Request {
  return new Request("http://localhost/api/chat/stream", {
    method: "POST",
    body: JSON.stringify({
      language: "en",
      messages: [{ role: "user", text: "hi" }],
      config,
    }),
  });
}

test("an upstream line past the line cap becomes response_too_long on the wire", async () => {
  const hostile: FetchLike = async () =>
    streamResponse(["data: " + "x".repeat(1_100_000)]);
  const response = await handleChatStream(chatRequest(), {
    env: envless,
    fetchImpl: hostile,
    slots: createStreamSlots({ perClient: 1, global: 1 }),
  });
  assert.deepEqual(await readEvents(response), [
    { type: "error", code: "response_too_long", provider: "router" },
  ]);
});

test("a normal reply through the handler is unaffected by the caps", async () => {
  const fine: FetchLike = async () => streamResponse(routerSse(["Hel", "lo"]));
  const events = await readEvents(
    await handleChatStream(chatRequest(), {
      env: envless,
      fetchImpl: fine,
      slots: createStreamSlots({ perClient: 1, global: 1 }),
    }),
  );
  assert.equal(textOf(events), "Hello");
  assert.equal(events.at(-1)?.type, "done");
});
