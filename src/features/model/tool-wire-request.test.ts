import assert from "node:assert/strict";
import test from "node:test";
import { fakeBody } from "../../shared/testing/stream-fixtures.ts";
import { createLocalAdapter } from "./local-adapter.ts";
import type { ModelRequest } from "./model-adapter.ts";
import { createRouterAdapter } from "./router-adapter.ts";
import type {
  ModelStreamChunk,
  StreamingModelAdapter,
} from "./stream-adapter.ts";
import type { ChatStreamEvent } from "./stream-events.ts";
import { streamWithFailover } from "./stream-with-failover.ts";
import type { ToolSpec } from "./tool-wire.ts";

const base: ModelRequest = {
  language: "en",
  systemPrompt: "sys",
  messages: [{ role: "user", text: "hi" }],
};

const tools: ToolSpec[] = [
  {
    name: "memory.add_note",
    description: "Save a note",
    parameters: {
      type: "object",
      properties: { text: { type: "string", maxLength: 500 } },
      required: ["text"],
    },
  },
];

/** Runs one streamReply against a fake fetch and returns the JSON it sent. */
async function sentBody(
  make: (fetchImpl: typeof fetch) => StreamingModelAdapter,
  request: ModelRequest,
) {
  let body: unknown;
  const adapter = make(async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return new Response(fakeBody(['data: {"choices":[]}\n', "data: [DONE]\n"]));
  });
  const open = await adapter.streamReply(request);
  assert.equal(open.ok, true);
  return body;
}

const router = (fetchImpl: typeof fetch) =>
  createRouterAdapter({
    baseUrl: "https://example.test/v1",
    model: "m",
    fetchImpl,
  });
const local = (fetchImpl: typeof fetch) =>
  createLocalAdapter({
    baseUrl: "http://localhost:11434",
    model: "m",
    fetchImpl,
  });

test("a request without tools has the exact body it had before", async () => {
  const expected = {
    model: "m",
    stream: true,
    messages: [
      { role: "system", content: "sys" },
      { role: "user", content: "hi" },
    ],
  };
  assert.deepEqual(await sentBody(router, base), expected);
  assert.deepEqual(await sentBody(local, base), expected);
  // Empty tools / transcript are inert too.
  const empty = { ...base, tools: [], toolTranscript: [] };
  assert.equal(
    JSON.stringify(await sentBody(router, empty)),
    JSON.stringify(expected),
  );
});

test("tools go out in the OpenAI tools format", async () => {
  const body = (await sentBody(router, { ...base, tools })) as {
    tools: unknown;
  };
  assert.deepEqual(body.tools, [
    {
      type: "function",
      function: {
        name: "memory.add_note",
        description: "Save a note",
        parameters: tools[0]!.parameters,
      },
    },
  ]);
  const localBody = (await sentBody(local, { ...base, tools })) as {
    tools: unknown;
  };
  assert.deepEqual(localBody.tools, body.tools);
});

test("the tool transcript becomes assistant tool_calls plus tool messages", async () => {
  const body = (await sentBody(router, {
    ...base,
    tools,
    toolTranscript: [
      {
        call: { id: "c1", name: "memory.add_note", argsJson: '{"text":"a"}' },
        result: { ok: true, text: "saved" },
      },
      {
        call: { id: "c2", name: "memory.add_note", argsJson: '{"text":"b"}' },
        result: { ok: false, text: "denied" },
      },
    ],
  })) as { messages: unknown[] };
  assert.deepEqual(body.messages.slice(2), [
    {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "c1",
          type: "function",
          function: { name: "memory.add_note", arguments: '{"text":"a"}' },
        },
        {
          id: "c2",
          type: "function",
          function: { name: "memory.add_note", arguments: '{"text":"b"}' },
        },
      ],
    },
    { role: "tool", tool_call_id: "c1", content: "saved" },
    { role: "tool", tool_call_id: "c2", content: "denied" },
  ]);
});

function fake(
  model: string,
  items: ModelStreamChunk[],
  calls: { n: number },
): StreamingModelAdapter {
  async function* chunks() {
    yield* items;
  }
  return {
    provider: "router",
    model,
    generateReply: async () => {
      throw new Error("not used");
    },
    streamReply: async () => {
      calls.n += 1;
      return { ok: true, provider: "router", chunks: chunks() };
    },
  };
}

async function run(
  primary: StreamingModelAdapter,
  fallback: StreamingModelAdapter,
) {
  const events: ChatStreamEvent[] = [];
  for await (const event of streamWithFailover({
    request: base,
    primary,
    fallback,
    signal: new AbortController().signal,
  })) {
    events.push(event);
  }
  return events;
}

test("a tool-only step is ready: no failover, no invalid_provider_response", async () => {
  const primaryCalls = { n: 0 };
  const fallbackCalls = { n: 0 };
  const call = {
    type: "tool_call",
    id: "c1",
    name: "t",
    argsJson: "{}",
  } as const;
  const events = await run(
    fake(
      "a",
      [call, { type: "usage", usage: { inputTokens: 3 } }],
      primaryCalls,
    ),
    fake("b", [{ type: "delta", text: "x" }], fallbackCalls),
  );
  assert.equal(fallbackCalls.n, 0);
  assert.deepEqual(
    events.map((event) => event.type),
    ["start", "tool_call", "done"],
  );
  assert.deepEqual(events[1], call);
});

test("failover still happens before any output in a tool step", async () => {
  const events = await run(
    fake("a", [{ type: "failed", code: "provider_unreachable" }], { n: 0 }),
    fake("b", [{ type: "tool_call", id: "c", name: "t", argsJson: "{}" }], {
      n: 0,
    }),
  );
  const done = events.at(-1);
  assert.equal(done?.type, "done");
  assert.equal(done?.type === "done" && done.failover?.toModel, "b");
});

test("a tool call after text is forwarded in order", async () => {
  const events = await run(
    fake(
      "a",
      [
        { type: "delta", text: "ok" },
        { type: "tool_call", id: "c", name: "t", argsJson: "{}" },
      ],
      { n: 0 },
    ),
    fake("b", [], { n: 0 }),
  );
  assert.deepEqual(
    events.map((event) => event.type),
    ["start", "delta", "tool_call", "done"],
  );
});
