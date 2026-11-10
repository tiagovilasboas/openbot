import assert from "node:assert/strict";
import test from "node:test";
import { fakeBody } from "../../shared/testing/stream-fixtures.ts";
import { createAnthropicAdapter } from "./anthropic-adapter.ts";
import { createLocalAdapter } from "./local-adapter.ts";
import type { FetchLike, ModelRequest } from "./model-adapter.ts";
import { createRouterAdapter } from "./router-adapter.ts";

function capture() {
  const bodies: Record<string, unknown>[] = [];
  const fetchImpl: FetchLike = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(fakeBody([]), { status: 200 });
  };
  return { bodies, fetchImpl };
}

const base: ModelRequest = {
  language: "en",
  messages: [{ role: "user", text: "hi" }],
};

for (const [name, make] of [
  [
    "router",
    (fetchImpl: FetchLike) =>
      createRouterAdapter({
        baseUrl: "https://example.test/v1",
        model: "global-model",
        fetchImpl,
      }),
  ],
  [
    "local",
    (fetchImpl: FetchLike) =>
      createLocalAdapter({
        baseUrl: "http://localhost:11434",
        model: "global-model",
        fetchImpl,
      }),
  ],
  [
    "anthropic",
    (fetchImpl: FetchLike) =>
      createAnthropicAdapter({
        apiKey: "k",
        model: "global-model",
        fetchImpl,
      }),
  ],
] as const) {
  test(`the ${name} stream uses the bot's model id, else the global one`, async () => {
    const { bodies, fetchImpl } = capture();
    const adapter = make(fetchImpl);
    const signal = new AbortController().signal;
    const run = async (request: ModelRequest) => {
      const opened = await adapter.streamReply(request, signal);
      if (opened.ok) for await (const _ of opened.chunks) void _;
    };
    await run({ ...base, modelId: "bot-model" });
    await run(base);
    assert.equal(bodies[0]?.model, "bot-model");
    assert.equal(bodies[1]?.model, "global-model");
  });
}
