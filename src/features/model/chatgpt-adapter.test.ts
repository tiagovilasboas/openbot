import assert from "node:assert/strict";
import test from "node:test";
import {
  routerSse,
  streamResponse,
} from "../../shared/testing/stream-fixtures.ts";
import {
  CHATGPT_API_BASE_URL,
  createChatGptAdapter,
} from "./chatgpt-adapter.ts";
import { selectAdapter } from "./select-adapter.ts";

const request = {
  language: "en" as const,
  messages: [{ role: "user" as const, text: "hello" }],
};

test("chatgpt adapter calls OpenAI chat completions with bearer token and redirect error", async () => {
  let seenUrl: string | undefined;
  let seenInit: RequestInit | undefined;
  const adapter = createChatGptAdapter({
    accessToken: "siwc-access-token",
    model: "gpt-4o",
    fetchImpl: async (url, init) => {
      seenUrl = String(url);
      seenInit = init;
      return Response.json({
        choices: [{ message: { content: "hi from chatgpt" } }],
        usage: { prompt_tokens: 10, completion_tokens: 4 },
      });
    },
  });

  assert.equal(adapter.provider, "chatgpt");
  assert.equal(adapter.model, "gpt-4o");
  const result = await adapter.generateReply(request);
  assert.deepEqual(result, {
    ok: true,
    provider: "chatgpt",
    text: "hi from chatgpt",
    usage: { inputTokens: 10, outputTokens: 4 },
  });
  assert.equal(seenUrl, `${CHATGPT_API_BASE_URL}/chat/completions`);
  assert.equal(seenInit?.redirect, "error");
  assert.equal(
    (seenInit?.headers as Record<string, string>).authorization,
    "Bearer siwc-access-token",
  );
  assert.equal(String(seenInit?.body).includes("siwc-access-token"), false);
});

test("chatgpt adapter streams SSE chunks and maps upstream errors without leaking token", async () => {
  const adapter = createChatGptAdapter({
    accessToken: "siwc-stream-secret",
    model: "gpt-4o",
    fetchImpl: async (_url, init) => {
      assert.equal(init?.redirect, "error");
      assert.equal(
        (init?.headers as Record<string, string>).authorization,
        "Bearer siwc-stream-secret",
      );
      return streamResponse(
        routerSse(["Hello", " world"], {
          usage: { prompt_tokens: 5, completion_tokens: 2 },
        }),
      );
    },
  });

  const open = await adapter.streamReply(request);
  assert.equal(open.ok, true);
  if (!open.ok) return;
  const chunks = [];
  for await (const chunk of open.chunks) chunks.push(chunk);
  assert.deepEqual(chunks, [
    { type: "delta", text: "Hello" },
    { type: "delta", text: " world" },
    { type: "usage", usage: { inputTokens: 5, outputTokens: 2 } },
  ]);

  const rejected = createChatGptAdapter({
    accessToken: "siwc-stream-secret",
    model: "gpt-4o",
    fetchImpl: async () =>
      Response.json(
        { error: { message: "bad secret token" } },
        { status: 401 },
      ),
  });
  const reply = await rejected.generateReply(request);
  assert.equal(reply.ok, false);
  if (!reply.ok) {
    assert.equal(reply.code, "provider_rejected");
    assert.equal(reply.provider, "chatgpt");
    assert.equal(reply.detail, "401: unauthorized");
  }
});

test("selectAdapter builds chatgpt adapter using passed OAuth token", async () => {
  let authHeader: string | undefined;
  const adapter = selectAdapter(
    {},
    { provider: "chatgpt", model: "gpt-4o" },
    async (_url, init) => {
      authHeader = (init?.headers as Record<string, string>).authorization;
      return Response.json({ choices: [{ message: { content: "ok" } }] });
    },
    { oauthTokens: { chatgpt: "resolved-oauth-token" } },
  );
  assert.ok(adapter);
  assert.equal(adapter.provider, "chatgpt");
  assert.equal(adapter.model, "gpt-4o");
  const result = await adapter.generateReply(request);
  assert.equal(result.ok, true);
  assert.equal(authHeader, "Bearer resolved-oauth-token");
});
