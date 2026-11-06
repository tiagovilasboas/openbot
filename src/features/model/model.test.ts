import assert from "node:assert/strict";
import test from "node:test";
import { createAnthropicAdapter } from "./anthropic-adapter.ts";
import { createLocalAdapter } from "./local-adapter.ts";
import { parseChatRequest } from "./parse-chat-request.ts";
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
});

test("selectAdapter returns null without explicit configuration", () => {
  assert.equal(selectAdapter({}), null);
  assert.equal(selectAdapter({ ANTHROPIC_API_KEY: "k" }), null);
  assert.equal(selectAdapter({ LOCAL_MODEL_URL: "http://x" }), null);
});

test("selectAdapter prefers local over cloud when both are configured", () => {
  const adapter = selectAdapter({
    LOCAL_MODEL_URL: "http://localhost:11434",
    LOCAL_MODEL_NAME: "m",
    ANTHROPIC_API_KEY: "k",
    ANTHROPIC_MODEL: "c",
  });
  assert.equal(adapter?.provider, "local");
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
