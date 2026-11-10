import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../../shared/testing/register-alias-resolver.mjs";

const { POST } = await import("./route.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function post(config: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        language: "en",
        messages: [{ role: "user", text: "hello" }],
        config,
      }),
    }),
  );
}

const routerConfig = {
  provider: "router",
  baseUrl: "https://router.test/v1",
  model: "vendor/model-a",
  apiKey: "client-key",
};

test("the reply carries the provider's usage as an added field", async () => {
  globalThis.fetch = (async () =>
    Response.json({
      choices: [{ message: { content: "hi" } }],
      usage: { prompt_tokens: 7, completion_tokens: 2 },
    })) as typeof fetch;
  const response = await post(routerConfig);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    provider: "router",
    text: "hi",
    usage: { inputTokens: 7, outputTokens: 2 },
  });
});

test("without usage from the provider the shape is the old one", async () => {
  globalThis.fetch = (async () =>
    Response.json({
      choices: [{ message: { content: "hi" } }],
    })) as typeof fetch;
  const body = await (await post(routerConfig)).json();
  assert.deepEqual(body, { provider: "router", text: "hi" });
});

test("usage and the failover notice travel together", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) {
      return Response.json(
        { error: { message: "slow down" } },
        { status: 429 },
      );
    }
    return Response.json({
      choices: [{ message: { content: "from fallback" } }],
      usage: { prompt_tokens: 4, completion_tokens: 6 },
    });
  }) as typeof fetch;
  const body = await (
    await post({ ...routerConfig, model: "openrouter/free" })
  ).json();
  assert.equal(body.text, "from fallback");
  assert.deepEqual(body.usage, { inputTokens: 4, outputTokens: 6 });
  assert.equal(body.failover.fromModel, "openrouter/free");
  assert.equal(calls, 2);
});
