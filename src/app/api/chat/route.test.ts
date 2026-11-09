import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import "../../../shared/testing/register-alias-resolver.mjs";

const { POST } = await import("./route.ts");

const realFetch = globalThis.fetch;
const envKeys = [
  "LOCAL_MODEL_URL",
  "LOCAL_MODEL_NAME",
  "ROUTER_URL",
  "ROUTER_MODEL",
  "ROUTER_API_KEY",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of envKeys) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of envKeys) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

const routerConfig = {
  provider: "router",
  baseUrl: "https://router.test/v1",
  model: "vendor/model-a",
  apiKey: "client-key",
};

function validBody(extra: Record<string, unknown> = {}) {
  return {
    language: "en",
    messages: [{ role: "user", text: "hello" }],
    config: routerConfig,
    ...extra,
  };
}

function post(body: unknown, raw = false) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw ? String(body) : JSON.stringify(body),
    }),
  );
}

function completion(text: string) {
  return Response.json({ choices: [{ message: { content: text } }] });
}

test("a valid request returns the provider reply without a failover marker", async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    urls.push(String(url));
    return completion("hi there");
  }) as typeof fetch;

  const response = await post(validBody());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    provider: "router",
    text: "hi there",
  });
  assert.deepEqual(urls, ["https://router.test/v1/chat/completions"]);
});

test("the system prompt reaches the provider as the first message", async () => {
  let sent: { messages: Array<{ role: string; content: string }> } | null =
    null;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    sent = JSON.parse(String(init?.body));
    return completion("ok");
  }) as typeof fetch;

  await post(validBody({ systemPrompt: "  be brief  " }));
  assert.deepEqual(sent!.messages[0], { role: "system", content: "be brief" });
  assert.deepEqual(sent!.messages[1], { role: "user", content: "hello" });
});

test("an unparsable body is an invalid request", async () => {
  const response = await post("{not json", true);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_request" });
});

test("invalid payload shapes are rejected with 400", async () => {
  const bad: unknown[] = [
    null,
    {},
    validBody({ language: "fr" }),
    validBody({ messages: [] }),
    validBody({ messages: [{ role: "assistant", text: "last is bot" }] }),
    validBody({ messages: [{ role: "user", text: "   " }] }),
    validBody({ config: { provider: "router", baseUrl: "ftp://x" } }),
  ];
  for (const body of bad) {
    const response = await post(body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.deepEqual(await response.json(), { error: "invalid_request" });
  }
});

test("without client config or server env the route answers 503", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return completion("never");
  }) as typeof fetch;

  const response = await post(validBody({ config: undefined }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "no_provider_configured" });
  assert.equal(called, false);
});

test("server env configures a provider when the client sends none", async () => {
  process.env.ROUTER_URL = "https://env-router.test/v1";
  process.env.ROUTER_MODEL = "env/model";
  const urls: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    urls.push(String(url));
    return completion("from env");
  }) as typeof fetch;

  const response = await post(validBody({ config: undefined }));
  assert.equal(response.status, 200);
  assert.equal(((await response.json()) as { text: string }).text, "from env");
  assert.deepEqual(urls, ["https://env-router.test/v1/chat/completions"]);
});

test("a provider rejection maps to 502 with error, provider and detail", async () => {
  globalThis.fetch = (async () =>
    Response.json(
      { error: { message: "bad key" } },
      { status: 401 },
    )) as typeof fetch;

  // A model with no automatic fallback pair still falls back to
  // openrouter/free, which fails the same way here.
  const response = await post(validBody());
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "provider_rejected",
    provider: "router",
    detail: "401: unauthorized",
  });
});

test("an unreachable provider maps to 502 provider_unreachable", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;

  const response = await post(validBody());
  assert.equal(response.status, 502);
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.error, "provider_unreachable");
  assert.equal(body.provider, "router");
});

test("an empty provider completion maps to invalid_provider_response", async () => {
  globalThis.fetch = (async () => completion("   ")) as typeof fetch;
  const response = await post(validBody());
  assert.equal(response.status, 502);
  assert.equal(
    ((await response.json()) as { error: string }).error,
    "invalid_provider_response",
  );
});

test("when the primary fails and the fallback answers, the reply carries the failover marker", async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    urls.push(String(url));
    const model = JSON.parse(String(init?.body)).model as string;
    return model === "vendor/model-a"
      ? Response.json({ error: { message: "overloaded" } }, { status: 503 })
      : completion("fallback answer");
  }) as typeof fetch;

  const response = await post(
    validBody({
      fallbackConfig: {
        provider: "router",
        baseUrl: "https://fallback.test/v1",
        model: "vendor/model-b",
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    provider: "router",
    text: "fallback answer",
    failover: {
      fromModel: "vendor/model-a",
      toModel: "vendor/model-b",
      reason: "503: upstream_error",
    },
  });
  assert.equal(urls.length, 2);
});

test("an invalid fallbackConfig is ignored instead of failing the request", async () => {
  globalThis.fetch = (async () => completion("primary")) as typeof fetch;
  const response = await post(
    validBody({ fallbackConfig: { provider: "router", baseUrl: "nope" } }),
  );
  assert.equal(response.status, 200);
  assert.equal(((await response.json()) as { text: string }).text, "primary");
});

test("a failing fallback surfaces the fallback's error as 502", async () => {
  globalThis.fetch = (async () =>
    Response.json(
      { error: { message: "down" } },
      { status: 500 },
    )) as typeof fetch;
  const response = await post(
    validBody({
      fallbackConfig: {
        provider: "router",
        baseUrl: "https://fallback.test/v1",
        model: "vendor/model-b",
      },
    }),
  );
  assert.equal(response.status, 502);
  assert.equal(
    ((await response.json()) as { detail: string }).detail,
    "500: upstream_error",
  );
});
