import assert from "node:assert/strict";
import test from "node:test";
import { createAnthropicAdapter } from "./anthropic-adapter.ts";
import { createLocalAdapter } from "./local-adapter.ts";
import { parseChatRequest } from "./parse-chat-request.ts";
import { createRouterAdapter } from "./router-adapter.ts";
import { selectAdapter } from "./select-adapter.ts";

const request = {
  language: "pt" as const,
  messages: [{ role: "user" as const, text: "oi" }],
};

function jsonFetch(body: unknown, status = 200): typeof fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
}

test("parser accepts a valid request and rejects malformed ones", () => {
  assert.equal(parseChatRequest(request).ok, true);
  assert.equal(parseChatRequest(null).ok, false);
  assert.equal(parseChatRequest({ ...request, language: "fr" }).ok, false);
  assert.equal(parseChatRequest({ ...request, messages: [] }).ok, false);
  assert.equal(
    parseChatRequest({
      ...request,
      messages: [{ role: "system", text: "x" }],
    }).ok,
    false,
  );
  assert.equal(
    parseChatRequest({
      ...request,
      messages: [{ role: "assistant", text: "x" }],
    }).ok,
    false,
  );
  assert.equal(
    parseChatRequest({
      ...request,
      config: {
        provider: "local",
        baseUrl: "http://localhost:11434",
        model: "llama3",
      },
    }).ok,
    true,
  );
  assert.equal(
    parseChatRequest({
      ...request,
      config: {
        provider: "invalid-provider",
      },
    }).ok,
    false,
  );

  const withPrompt = parseChatRequest({
    ...request,
    systemPrompt: "You are OpenBot",
  });
  assert.equal(withPrompt.ok, true);
  if (withPrompt.ok) {
    assert.equal(withPrompt.request.systemPrompt, "You are OpenBot");
  }
});

test("selectAdapter returns null without explicit configuration", () => {
  assert.equal(selectAdapter({}), null);
  assert.equal(selectAdapter({ ANTHROPIC_API_KEY: "k" }), null);
  assert.equal(selectAdapter({ LOCAL_MODEL_URL: "http://x" }), null);
  assert.equal(selectAdapter({ ROUTER_URL: "http://x" }), null);
});

test("selectAdapter honors configuration priorities: local > router > anthropic", () => {
  const localWin = selectAdapter({
    LOCAL_MODEL_URL: "http://localhost:11434",
    LOCAL_MODEL_NAME: "m",
    ROUTER_URL: "http://localhost:3000/v1",
    ROUTER_MODEL: "rm",
    ANTHROPIC_API_KEY: "k",
    ANTHROPIC_MODEL: "c",
  });
  assert.equal(localWin?.provider, "local");

  const routerWin = selectAdapter({
    ROUTER_URL: "http://localhost:3000/v1",
    ROUTER_MODEL: "rm",
    ANTHROPIC_API_KEY: "k",
    ANTHROPIC_MODEL: "c",
  });
  assert.equal(routerWin?.provider, "router");

  const anthropicWin = selectAdapter({
    ANTHROPIC_API_KEY: "k",
    ANTHROPIC_MODEL: "c",
  });
  assert.equal(anthropicWin?.provider, "anthropic");

  const customOverride = selectAdapter(
    { LOCAL_MODEL_URL: "http://localhost:11434", LOCAL_MODEL_NAME: "m" },
    {
      provider: "router",
      baseUrl: "http://localhost:3000/v1",
      model: "custom-router-model",
    },
  );
  assert.equal(customOverride?.provider, "router");
  assert.equal(customOverride?.model, "custom-router-model");
});

test("local adapter returns the reply text", async () => {
  const adapter = createLocalAdapter({
    baseUrl: "http://localhost:11434/",
    model: "m",
    fetchImpl: jsonFetch({ message: { content: "olá" } }),
  });
  assert.deepEqual(await adapter.generateReply(request), {
    ok: true,
    provider: "local",
    text: "olá",
  });
});

test("router adapter parses OpenAI-compatible choices payload", async () => {
  let seenUrl: string | undefined;
  let seenHeaders: HeadersInit | undefined;
  const adapter = createRouterAdapter({
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    apiKey: "router-key",
    fetchImpl: async (url, init) => {
      seenUrl = String(url);
      seenHeaders = init?.headers;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "resposta do router" } }],
        }),
        { headers: { "content-type": "application/json" } },
      );
    },
  });

  const result = await adapter.generateReply(request);
  assert.deepEqual(result, {
    ok: true,
    provider: "router",
    text: "resposta do router",
  });
  assert.equal(seenUrl, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(
    (seenHeaders as Record<string, string>).authorization,
    "Bearer router-key",
  );
});

test("router adapter normalizes baseUrl already containing /chat/completions", async () => {
  let seenUrl: string | undefined;
  const adapter = createRouterAdapter({
    baseUrl: "http://localhost:8000/v1/chat/completions/",
    model: "m",
    fetchImpl: async (url) => {
      seenUrl = String(url);
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok" } }],
        }),
      );
    },
  });

  const result = await adapter.generateReply(request);
  assert.equal(result.ok && result.text, "ok");
  assert.equal(seenUrl, "http://localhost:8000/v1/chat/completions");
});

test("adapters map failures to typed errors", async () => {
  const unreachable = createLocalAdapter({
    baseUrl: "http://x",
    model: "m",
    fetchImpl: async () => {
      throw new Error("down");
    },
  });
  const unreachableResult = await unreachable.generateReply(request);
  assert.equal(
    unreachableResult.ok === false && unreachableResult.code,
    "provider_unreachable",
  );

  const rejected = createAnthropicAdapter({
    apiKey: "k",
    model: "m",
    fetchImpl: jsonFetch({}, 401),
  });
  const rejectedResult = await rejected.generateReply(request);
  assert.equal(
    rejectedResult.ok === false && rejectedResult.code,
    "provider_rejected",
  );

  const invalid = createAnthropicAdapter({
    apiKey: "k",
    model: "m",
    fetchImpl: jsonFetch({ content: [] }),
  });
  const invalidResult = await invalid.generateReply(request);
  assert.equal(
    invalidResult.ok === false && invalidResult.code,
    "invalid_provider_response",
  );

  const routerInvalid = createRouterAdapter({
    baseUrl: "http://x",
    model: "m",
    fetchImpl: jsonFetch({ choices: [] }),
  });
  const routerResult = await routerInvalid.generateReply(request);
  assert.equal(
    routerResult.ok === false && routerResult.code,
    "invalid_provider_response",
  );
});

test("anthropic adapter sends the key only as a header", async () => {
  let seen: RequestInit | undefined;
  const adapter = createAnthropicAdapter({
    apiKey: "secret-key",
    model: "m",
    fetchImpl: async (_url, init) => {
      seen = init;
      return new Response(JSON.stringify({ content: [{ text: "hi" }] }));
    },
  });
  const result = await adapter.generateReply(request);
  assert.equal(result.ok && result.text, "hi");
  assert.equal(
    (seen?.headers as Record<string, string>)["x-api-key"],
    "secret-key",
  );
  assert.equal(String(seen?.body).includes("secret-key"), false);
});
