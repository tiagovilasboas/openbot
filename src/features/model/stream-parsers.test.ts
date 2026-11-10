import assert from "node:assert/strict";
import test from "node:test";
import { fakeBody } from "../../shared/testing/stream-fixtures.ts";
import { parseAnthropicStream } from "./anthropic-stream.ts";
import { parseLocalStream } from "./local-stream.ts";
import { parseRouterStream } from "./router-stream.ts";
import type { ModelStreamChunk } from "./stream-adapter.ts";
import { readLines } from "./stream-lines.ts";

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

test("readLines joins text split across chunks and handles CRLF", async () => {
  const lines: string[] = [];
  for await (const line of readLines(
    fakeBody(['data: {"a"', ":1}\r\n\r\nda", "ta: x\n", "tail"]),
  )) {
    lines.push(line);
  }
  assert.deepEqual(lines, ['data: {"a":1}', "", "data: x", "tail"]);
});

test("the anthropic parser yields text, usage, and stops at message_stop", async () => {
  const chunks = await collect(parseAnthropicStream, [
    "event: message_start",
    'data: {"type":"message_start","message":{"usage":{"input_tokens":12,"output_tokens":1}}}',
    'data: {"type":"ping"}',
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hel"}}',
    'data: {"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"{}"}}',
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"lo"}}',
    'data: {"type":"message_delta","usage":{"output_tokens":9}}',
    'data: {"type":"message_stop"}',
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ignored"}}',
  ]);
  assert.deepEqual(chunks, [
    { type: "usage", usage: { inputTokens: 12, outputTokens: 1 } },
    { type: "delta", text: "Hel" },
    { type: "delta", text: "lo" },
    { type: "usage", usage: { inputTokens: undefined, outputTokens: 9 } },
  ]);
});

test("an anthropic error event fails with a fixed detail, not provider text", async () => {
  const chunks = await collect(parseAnthropicStream, [
    'data: {"type":"error","error":{"type":"overloaded_error","message":"secret echo"}}',
  ]);
  assert.deepEqual(chunks, [
    {
      type: "failed",
      code: "provider_rejected",
      detail: "529: upstream_error",
    },
  ]);
});

test("a stream cut before message_stop is a failure", async () => {
  const chunks = await collect(parseAnthropicStream, [
    'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"par"}}',
  ]);
  assert.equal(chunks[1].type, "failed");
});

test("the router parser reads deltas and usage, ignores comments, ends at [DONE]", async () => {
  const chunks = await collect(parseRouterStream, [
    ": OPENROUTER PROCESSING",
    'data: {"choices":[{"delta":{"role":"assistant","content":""}}]}',
    'data: {"choices":[{"delta":{"content":"Hi"}}]}',
    'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":4,"completion_tokens":2}}',
    "data: [DONE]",
  ]);
  assert.deepEqual(chunks, [
    { type: "delta", text: "Hi" },
    { type: "usage", usage: { inputTokens: 4, outputTokens: 2 } },
  ]);
});

test("a router stream without [DONE] is fine after a finish_reason, a failure otherwise", async () => {
  const done = await collect(parseRouterStream, [
    'data: {"choices":[{"delta":{"content":"x"},"finish_reason":"stop"}]}',
  ]);
  assert.deepEqual(done, [{ type: "delta", text: "x" }]);
  const cut = await collect(parseRouterStream, [
    'data: {"choices":[{"delta":{"content":"x"}}]}',
  ]);
  assert.equal(cut[1].type, "failed");
});

test("a router error object fails with a status-based tag", async () => {
  const chunks = await collect(parseRouterStream, [
    'data: {"error":{"code":429,"message":"too many for key sk-123"}}',
  ]);
  assert.deepEqual(chunks, [
    { type: "failed", code: "provider_rejected", detail: "429: rate_limited" },
  ]);
});

test("the local parser reads NDJSON and the final token counts", async () => {
  const chunks = await collect(parseLocalStream, [
    '{"message":{"content":"Ol"},"done":false}',
    "",
    '{"message":{"content":"á"},"done":false}',
    '{"message":{"content":""},"done":true,"prompt_eval_count":5,"eval_count":3}',
  ]);
  assert.deepEqual(chunks, [
    { type: "delta", text: "Ol" },
    { type: "delta", text: "á" },
    { type: "usage", usage: { inputTokens: 5, outputTokens: 3 } },
  ]);
});

test("a local error line or a missing done marker is a failure", async () => {
  const error = await collect(parseLocalStream, [
    '{"error":"model not found"}',
  ]);
  assert.deepEqual(error, [
    {
      type: "failed",
      code: "provider_rejected",
      detail: "500: upstream_error",
    },
  ]);
  const cut = await collect(parseLocalStream, [
    '{"message":{"content":"a"},"done":false}',
  ]);
  assert.equal(cut[1].type, "failed");
});
