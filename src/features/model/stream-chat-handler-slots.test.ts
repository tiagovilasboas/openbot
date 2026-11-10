import assert from "node:assert/strict";
import test from "node:test";
import {
  fakeBody,
  routerSse,
  streamResponse,
} from "../../shared/testing/stream-fixtures.ts";
import { createStreamSlots } from "../server-guard/stream-slots.ts";
import type { FetchLike } from "./model-adapter.ts";
import { handleChatStream } from "./stream-chat-handler.ts";

const env = {};

function chatRequest(
  headers: Record<string, string> = {},
  signal?: AbortSignal,
): Request {
  return new Request("http://localhost/api/chat/stream", {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      language: "en",
      messages: [{ role: "user", text: "hi" }],
      config: {
        provider: "router",
        baseUrl: "https://93.184.216.34/v1",
        model: "vendor/model",
      },
    }),
  });
}

const okFetch: FetchLike = async () => streamResponse(routerSse(["hello"]));

test("a finished stream gives its slot back", async () => {
  const slots = createStreamSlots({ perClient: 1, global: 5 });
  const response = await handleChatStream(chatRequest(), {
    env,
    fetchImpl: okFetch,
    slots,
  });
  assert.equal(response.status, 200);
  assert.equal(slots.open(), 1, "held while the reply streams");
  await response.text();
  assert.equal(slots.open(), 0);
});

test("an upstream error gives its slot back", async () => {
  const slots = createStreamSlots({ perClient: 1, global: 5 });
  const failing: FetchLike = async () => new Response("{}", { status: 500 });
  const response = await handleChatStream(chatRequest(), {
    env,
    fetchImpl: failing,
    slots,
  });
  await response.text();
  assert.equal(slots.open(), 0);
});

test("a stream that breaks mid-reply gives its slot back", async () => {
  const slots = createStreamSlots({ perClient: 1, global: 5 });
  const broken: FetchLike = async () =>
    streamResponse(routerSse(["partial"]).slice(0, 1), { reset: true });
  const response = await handleChatStream(chatRequest(), {
    env,
    fetchImpl: broken,
    slots,
  });
  await response.text();
  assert.equal(slots.open(), 0);
});

test("the client cancelling the body gives its slot back", async () => {
  const slots = createStreamSlots({ perClient: 1, global: 5 });
  const hanging: FetchLike = async (_url, init) =>
    new Response(
      fakeBody(routerSse(["first"]).slice(0, 1), {
        signal: init?.signal,
        hang: true,
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
  const response = await handleChatStream(chatRequest(), {
    env,
    fetchImpl: hanging,
    slots,
  });
  const reader = response.body!.getReader();
  await reader.read();
  assert.equal(slots.open(), 1);
  await reader.cancel();
  assert.equal(slots.open(), 0);
});

test("a stream nobody reads is freed when the client request aborts", async () => {
  const slots = createStreamSlots({ perClient: 1, global: 5 });
  const gone = new AbortController();
  const response = await handleChatStream(chatRequest({}, gone.signal), {
    env,
    fetchImpl: okFetch,
    slots,
  });
  assert.equal(response.status, 200);
  assert.equal(slots.open(), 1);
  gone.abort();
  assert.equal(slots.open(), 0);
});

test("a stream nobody reads is freed by the overall deadline", async () => {
  const slots = createStreamSlots({ perClient: 1, global: 5 });
  await handleChatStream(chatRequest(), {
    env,
    fetchImpl: okFetch,
    slots,
    timeoutMs: 20,
  });
  assert.equal(slots.open(), 1);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(slots.open(), 0);
});

test("over the cap answers 429 too_many_streams before any provider call", async () => {
  const slots = createStreamSlots({ perClient: 1, global: 5 });
  let providerCalls = 0;
  const counting: FetchLike = async (...args) => {
    providerCalls += 1;
    return okFetch(...args);
  };
  const first = await handleChatStream(chatRequest(), {
    env,
    fetchImpl: counting,
    slots,
  });
  // The provider is called once the reply is pulled.
  const reader = first.body!.getReader();
  await reader.read();
  const callsAfterFirst = providerCalls;
  assert.ok(callsAfterFirst >= 1);
  const second = await handleChatStream(chatRequest(), {
    env,
    fetchImpl: counting,
    slots,
  });
  assert.equal(second.status, 429);
  assert.deepEqual(await second.json(), { error: "too_many_streams" });
  assert.equal(providerCalls, callsAfterFirst, "no provider call for the 429");
  assert.equal(slots.open(), 1, "the refused request took no slot");

  await reader.cancel();
  const third = await handleChatStream(chatRequest(), {
    env,
    fetchImpl: counting,
    slots,
  });
  assert.equal(third.status, 200);
  await third.text();
});

test("invalid requests do not take a slot", async () => {
  const slots = createStreamSlots({ perClient: 1, global: 5 });
  const response = await handleChatStream(
    new Request("http://localhost/api/chat/stream", {
      method: "POST",
      body: "not json",
    }),
    { env, fetchImpl: okFetch, slots },
  );
  assert.equal(response.status, 400);
  assert.equal(slots.open(), 0);
});

test("callers are counted per key only when the proxy is trusted", async () => {
  const proxied = { OPENBOT_TRUST_PROXY: "1" };
  const slots = createStreamSlots({ perClient: 1, global: 5 });
  const a = await handleChatStream(
    chatRequest({ "x-forwarded-for": "10.0.0.1" }),
    { env: proxied, fetchImpl: okFetch, slots },
  );
  const b = await handleChatStream(
    chatRequest({ "x-forwarded-for": "10.0.0.2" }),
    { env: proxied, fetchImpl: okFetch, slots },
  );
  assert.equal(b.status, 200, "another client has its own slot");
  const again = await handleChatStream(
    chatRequest({ "x-forwarded-for": "spoof, 10.0.0.1" }),
    { env: proxied, fetchImpl: okFetch, slots },
  );
  assert.equal(again.status, 429, "a spoofed first hop is the same client");
  await Promise.all([a.text(), b.text()]);

  // Untrusted: rotating the header changes nothing, everyone shares a key.
  const shared = createStreamSlots({ perClient: 1, global: 5 });
  const first = await handleChatStream(
    chatRequest({ "x-forwarded-for": "10.0.0.1" }),
    { env, fetchImpl: okFetch, slots: shared },
  );
  const second = await handleChatStream(
    chatRequest({ "x-forwarded-for": "10.0.0.2" }),
    { env, fetchImpl: okFetch, slots: shared },
  );
  assert.equal(second.status, 429);
  await first.text();
});
