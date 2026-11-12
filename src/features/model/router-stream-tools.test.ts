import assert from "node:assert/strict";
import test from "node:test";
import { parseLocalStream } from "./local-stream.ts";
import { parseRouterStream } from "./router-stream.ts";
import type { ModelStreamChunk } from "./stream-adapter.ts";
import { MAX_TOOL_ARGS_CHARS } from "./tool-wire.ts";

async function collect(
  parser: (lines: AsyncIterable<string>) => AsyncIterable<ModelStreamChunk>,
  lines: string[],
) {
  async function* source() {
    yield* lines;
  }
  const chunks: ModelStreamChunk[] = [];
  for await (const chunk of parser(source())) chunks.push(chunk);
  return chunks;
}

const sse = (delta: unknown, finish: string | null = null) =>
  `data: ${JSON.stringify({ choices: [{ delta, finish_reason: finish }] })}`;

test("argument fragments are assembled across chunks into one call", async () => {
  const chunks = await collect(parseRouterStream, [
    sse({
      tool_calls: [
        {
          index: 0,
          id: "call_a",
          function: { name: "github.list_open_items", arguments: "" },
        },
      ],
    }),
    sse({ tool_calls: [{ index: 0, function: { arguments: '{"owner":"o' } }] }),
    sse({
      tool_calls: [{ index: 0, function: { arguments: '","repo":"r"}' } }],
    }),
    sse({}, "tool_calls"),
    "data: [DONE]",
  ]);
  assert.deepEqual(chunks, [
    {
      type: "tool_call",
      id: "call_a",
      name: "github.list_open_items",
      argsJson: '{"owner":"o","repo":"r"}',
    },
  ]);
});

test("parallel calls interleaved by index come out whole and in index order", async () => {
  const chunks = await collect(parseRouterStream, [
    sse({
      tool_calls: [
        { index: 1, id: "b", function: { name: "two", arguments: '{"y"' } },
        { index: 0, id: "a", function: { name: "one", arguments: '{"x"' } },
      ],
    }),
    sse({
      tool_calls: [
        { index: 0, function: { arguments: ":1}" } },
        { index: 1, function: { arguments: ":2}" } },
      ],
    }),
    sse({}, "tool_calls"),
  ]);
  assert.deepEqual(chunks, [
    { type: "tool_call", id: "a", name: "one", argsJson: '{"x":1}' },
    { type: "tool_call", id: "b", name: "two", argsJson: '{"y":2}' },
  ]);
});

test("text and a tool call in one step both come through", async () => {
  const chunks = await collect(parseRouterStream, [
    sse({ content: "Let me check." }),
    sse({
      tool_calls: [
        { index: 0, id: "a", function: { name: "t", arguments: "{}" } },
      ],
    }),
    sse({}, "tool_calls"),
  ]);
  assert.deepEqual(
    chunks.map((chunk) => chunk.type),
    ["delta", "tool_call"],
  );
});

test("arguments over 8 KB become an error-tagged call with no arguments", async () => {
  const half = "x".repeat(MAX_TOOL_ARGS_CHARS / 2 + 1);
  const chunks = await collect(parseRouterStream, [
    sse({
      tool_calls: [
        { index: 0, id: "a", function: { name: "t", arguments: half } },
      ],
    }),
    sse({ tool_calls: [{ index: 0, function: { arguments: half } }] }),
    sse({ tool_calls: [{ index: 0, function: { arguments: "more" } }] }),
    sse({}, "tool_calls"),
  ]);
  assert.deepEqual(chunks, [
    {
      type: "tool_call",
      id: "a",
      name: "t",
      argsJson: "",
      argsError: "too_long",
    },
  ]);
});

test("arguments exactly at the cap are kept", async () => {
  const args = "y".repeat(MAX_TOOL_ARGS_CHARS);
  const chunks = await collect(parseRouterStream, [
    sse({
      tool_calls: [
        { index: 0, id: "a", function: { name: "t", arguments: args } },
      ],
    }),
    sse({}, "stop"),
  ]);
  assert.equal(chunks[0]?.type === "tool_call" && chunks[0].argsJson, args);
});

test("malformed fragments are dropped without throwing", async () => {
  const chunks = await collect(parseRouterStream, [
    sse({ tool_calls: "nope" }),
    sse({
      tool_calls: [null, 7, "x", { index: "0" }, { index: -1 }, { index: 99 }],
    }),
    sse({ tool_calls: [{ index: 0, id: "a", function: { arguments: "{}" } }] }),
    sse({
      tool_calls: [
        { index: 1, id: "b", function: { name: "bad name!", arguments: "{}" } },
      ],
    }),
    sse({
      tool_calls: [{ index: 2, function: { name: "ok", arguments: 5 } }],
    }),
    sse({}, "tool_calls"),
  ]);
  // index 0 has no name, index 1 has an invalid name: both dropped.
  assert.deepEqual(chunks, [
    { type: "tool_call", id: "call_2", name: "ok", argsJson: "" },
  ]);
});

test("a stream cut off before finish_reason drops the unfinished call", async () => {
  const chunks = await collect(parseRouterStream, [
    sse({
      tool_calls: [
        { index: 0, id: "a", function: { name: "t", arguments: '{"x' } },
      ],
    }),
  ]);
  assert.deepEqual(chunks, [{ type: "failed", code: "provider_unreachable" }]);
});

test("the local parser turns whole calls into JSON argument text", async () => {
  const chunks = await collect(parseLocalStream, [
    JSON.stringify({
      message: {
        content: "",
        tool_calls: [{ function: { name: "t", arguments: { a: 1 } } }],
      },
    }),
    JSON.stringify({ done: true }),
  ]);
  assert.deepEqual(chunks, [
    { type: "tool_call", id: "call_0", name: "t", argsJson: '{"a":1}' },
  ]);
});
