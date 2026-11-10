import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import "../../../../shared/testing/register-alias-resolver.mjs";
import {
  readEvents,
  routerSse,
  streamResponse,
} from "../../../../shared/testing/stream-fixtures.ts";

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

function post(body: unknown, signal?: AbortSignal) {
  return POST(
    new Request("http://localhost/api/chat/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
      signal,
    }),
  );
}

function validBody(extra: Record<string, unknown> = {}) {
  return {
    language: "en",
    messages: [{ role: "user", text: "hello" }],
    config: routerConfig,
    ...extra,
  };
}

function modelOf(init?: RequestInit): string {
  return JSON.parse(String(init?.body)).model as string;
}

test("a valid request streams start, deltas and done as NDJSON", async () => {
  const sent: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return streamResponse(
      routerSse(["Hel", "lo"], {
        usage: { prompt_tokens: 7, completion_tokens: 2 },
      }),
    );
  }) as typeof fetch;

  const response = await post(validBody({ systemPrompt: "be brief" }));
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^application\/x-ndjson/,
  );
  assert.deepEqual(await readEvents(response), [
    { type: "start", provider: "router", model: "vendor/model-a" },
    { type: "delta", text: "Hel" },
    { type: "delta", text: "lo" },
    {
      type: "done",
      provider: "router",
      model: "vendor/model-a",
      usage: { inputTokens: 7, outputTokens: 2 },
    },
  ]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "https://router.test/v1/chat/completions");
  assert.equal(sent[0].body.stream, true);
  assert.deepEqual((sent[0].body.messages as unknown[])[0], {
    role: "system",
    content: "be brief",
  });
});

test("a failure before the first delta fails over and reports it in start and done", async () => {
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) =>
    modelOf(init) === "vendor/model-a"
      ? Response.json({ error: { message: "overloaded" } }, { status: 503 })
      : streamResponse(routerSse(["from fallback"]))) as typeof fetch;

  const events = await readEvents(
    await post(
      validBody({
        fallbackConfig: { ...routerConfig, model: "vendor/model-b" },
      }),
    ),
  );
  assert.deepEqual(events, [
    { type: "start", provider: "router", model: "vendor/model-b" },
    { type: "delta", text: "from fallback" },
    {
      type: "done",
      provider: "router",
      model: "vendor/model-b",
      failover: {
        fromModel: "vendor/model-a",
        toModel: "vendor/model-b",
        reason: "503: upstream_error",
      },
    },
  ]);
});

test("an empty first stream also fails over, since no text was shown", async () => {
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) =>
    modelOf(init) === "vendor/model-a"
      ? streamResponse(routerSse([]))
      : streamResponse(routerSse(["second"]))) as typeof fetch;

  const events = await readEvents(
    await post(
      validBody({
        fallbackConfig: { ...routerConfig, model: "vendor/model-b" },
      }),
    ),
  );
  assert.equal(events.at(-1)?.type, "done");
  assert.deepEqual(events[1], { type: "delta", text: "second" });
});

test("a failure after the first delta is an error event, with no failover", async () => {
  const models: string[] = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    models.push(modelOf(init));
    return streamResponse([
      'data: {"choices":[{"delta":{"content":"par"}}]}\n\n',
      'data: {"error":{"code":429,"message":"key sk-leak exhausted"}}\n\n',
    ]);
  }) as typeof fetch;

  const response = await post(
    validBody({ fallbackConfig: { ...routerConfig, model: "vendor/model-b" } }),
  );
  const events = await readEvents(response);
  assert.deepEqual(events, [
    { type: "start", provider: "router", model: "vendor/model-a" },
    { type: "delta", text: "par" },
    { type: "error", code: "rate_limit", provider: "router", status: 429 },
  ]);
  assert.deepEqual(models, ["vendor/model-a"]);
});

test("a dropped connection mid-stream is an unreachable error event", async () => {
  globalThis.fetch = (async () =>
    streamResponse(['data: {"choices":[{"delta":{"content":"par"}}]}\n\n'], {
      reset: true,
    })) as typeof fetch;

  const events = await readEvents(await post(validBody()));
  assert.deepEqual(
    events.map((event) => event.type),
    ["start", "delta", "error"],
  );
  assert.deepEqual(events[2], {
    type: "error",
    code: "unreachable",
    provider: "router",
  });
});

test("when every model fails before text, one typed error event ends the stream", async () => {
  globalThis.fetch = (async () =>
    Response.json(
      { error: { message: "bad key sk-1" } },
      { status: 401 },
    )) as typeof fetch;

  const response = await post(validBody());
  const text = await response.clone().text();
  assert.equal(response.status, 200);
  assert.deepEqual(await readEvents(response), [
    { type: "error", code: "auth", provider: "router", status: 401 },
  ]);
  assert.ok(!text.includes("sk-1"));
});

test("a blocked base URL is reported as blocked_url without a fallback attempt", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return streamResponse(routerSse(["never"]));
  }) as typeof fetch;

  const events = await readEvents(
    await post(
      validBody({
        config: { ...routerConfig, baseUrl: "http://169.254.169.254/v1" },
      }),
    ),
  );
  assert.deepEqual(events, [
    { type: "error", code: "blocked_url", provider: "router" },
  ]);
  assert.equal(called, false);
});

test("aborting the request aborts the upstream call and ends the stream quietly", async () => {
  let upstreamSignal: AbortSignal | null | undefined;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    upstreamSignal = init?.signal;
    return streamResponse(
      ['data: {"choices":[{"delta":{"content":"par"}}]}\n\n'],
      { signal: init?.signal, hang: true },
    );
  }) as typeof fetch;

  const client = new AbortController();
  const response = await post(validBody(), client.signal);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let seen = "";
  while (!seen.includes('"delta"')) {
    const { value, done } = await reader.read();
    assert.equal(done, false);
    seen += decoder.decode(value);
  }

  client.abort();
  let tail = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    tail += decoder.decode(value);
  }
  assert.equal(upstreamSignal?.aborted, true);
  assert.ok(!tail.includes('"done"') && !tail.includes('"error"'));
});

test("cancelling the response body also aborts the upstream call", async () => {
  let upstreamSignal: AbortSignal | null | undefined;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    upstreamSignal = init?.signal;
    return streamResponse(
      ['data: {"choices":[{"delta":{"content":"par"}}]}\n\n'],
      { signal: init?.signal, hang: true },
    );
  }) as typeof fetch;

  const response = await post(validBody());
  const reader = response.body!.getReader();
  await reader.read();
  await reader.read();
  await reader.cancel();
  assert.equal(upstreamSignal?.aborted, true);
});

test("invalid payloads are rejected with 400 before any stream starts", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return streamResponse(routerSse(["never"]));
  }) as typeof fetch;

  for (const bad of [
    "{not json",
    { language: "fr", messages: [{ role: "user", text: "x" }] },
    { language: "en", messages: [] },
    { language: "en", messages: [{ role: "assistant", text: "x" }] },
  ]) {
    const response = await post(bad);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_request" });
  }
  assert.equal(called, false);
});

test("with no provider configured the answer is 503 JSON", async () => {
  const response = await post(validBody({ config: undefined }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "no_provider_configured" });
});

test("the anthropic adapter streams through the same route", async () => {
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    assert.equal(String(url), "https://api.anthropic.com/v1/messages");
    assert.equal(JSON.parse(String(init?.body)).stream, true);
    return streamResponse([
      'data: {"type":"message_start","message":{"usage":{"input_tokens":3}}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n\n',
      'data: {"type":"message_delta","usage":{"output_tokens":1}}\n\n',
      'data: {"type":"message_stop"}\n\n',
    ]);
  }) as typeof fetch;

  const events = await readEvents(
    await post(
      validBody({
        config: { provider: "anthropic", apiKey: "k", model: "claude-x" },
      }),
    ),
  );
  assert.deepEqual(events.at(-1), {
    type: "done",
    provider: "anthropic",
    model: "claude-x",
    usage: { inputTokens: 3, outputTokens: 1 },
  });
});

test("the local adapter streams NDJSON from /api/chat", async () => {
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    assert.equal(String(url), "http://localhost:11434/api/chat");
    assert.equal(JSON.parse(String(init?.body)).stream, true);
    return streamResponse([
      '{"message":{"content":"o"},"done":false}\n{"message":{"content":"k"},"done":false}\n',
      '{"done":true,"prompt_eval_count":2,"eval_count":2}\n',
    ]);
  }) as typeof fetch;

  const events = await readEvents(
    await post(
      validBody({
        config: {
          provider: "local",
          baseUrl: "http://localhost:11434",
          model: "llama",
        },
      }),
    ),
  );
  assert.deepEqual(
    events.filter((event) => event.type === "delta"),
    [
      { type: "delta", text: "o" },
      { type: "delta", text: "k" },
    ],
  );
  assert.equal(events.at(-1)?.type, "done");
});
