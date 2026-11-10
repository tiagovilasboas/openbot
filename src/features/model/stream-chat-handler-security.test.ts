import assert from "node:assert/strict";
import test from "node:test";
import type { FetchLike } from "./model-adapter.ts";
import { handleChatStream } from "./stream-chat-handler.ts";

type Captured = { url: string; auth: string | null; model: unknown };

function recordingFetch(captured: Captured[]): FetchLike {
  return async (url, init) => {
    const headers = new Headers(init?.headers);
    captured.push({
      url: String(url),
      auth: headers.get("authorization"),
      model: JSON.parse(String(init?.body)).model,
    });
    return new Response("{}", { status: 500 });
  };
}

function chatRequest(extra: Record<string, unknown>): Request {
  return new Request("http://localhost/api/chat/stream", {
    method: "POST",
    body: JSON.stringify({
      language: "en",
      messages: [{ role: "user", text: "hi" }],
      ...extra,
    }),
  });
}

const serverRouterEnv = {
  ROUTER_URL: "https://router.internal.example/v1",
  ROUTER_MODEL: "server/model",
  ROUTER_API_KEY: "SERVER-SECRET",
};

test("the automatic fallback never sends the server key to a client-chosen URL", async () => {
  const captured: Captured[] = [];
  const response = await handleChatStream(
    chatRequest({
      config: {
        provider: "router",
        baseUrl: "https://93.184.216.34/v1",
        model: "vendor/model",
      },
    }),
    { env: serverRouterEnv, fetchImpl: recordingFetch(captured) },
  );
  await response.text();
  assert.ok(captured.length >= 1);
  for (const call of captured) {
    assert.ok(
      !(call.auth ?? "").includes("SERVER-SECRET"),
      `the server key reached ${call.url}`,
    );
    assert.ok(call.url.startsWith("https://93.184.216.34/"));
  }
});

test("the stream route enforces OPENBOT_ALLOWED_MODELS like the plain route", async () => {
  const captured: Captured[] = [];
  const response = await handleChatStream(
    chatRequest({ modelId: "expensive/model" }),
    {
      env: { ...serverRouterEnv, OPENBOT_ALLOWED_MODELS: "allowed/m" },
      fetchImpl: recordingFetch(captured),
    },
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "model_not_allowed" });
  assert.equal(captured.length, 0);
});

test("a listed model id still streams", async () => {
  const captured: Captured[] = [];
  const response = await handleChatStream(
    chatRequest({ modelId: "allowed/m" }),
    {
      env: { ...serverRouterEnv, OPENBOT_ALLOWED_MODELS: "allowed/m" },
      fetchImpl: recordingFetch(captured),
    },
  );
  assert.equal(response.status, 200);
  await response.text();
  assert.equal(captured[0]?.model, "allowed/m");
});

test("the fallback does not reuse the bot's model id", async () => {
  const captured: Captured[] = [];
  const response = await handleChatStream(
    chatRequest({ modelId: "bot/model" }),
    {
      env: serverRouterEnv,
      fetchImpl: recordingFetch(captured),
    },
  );
  await response.text();
  assert.equal(captured[0]?.model, "bot/model");
  assert.ok(captured.length >= 2, "expected a fallback attempt");
  for (const call of captured.slice(1)) {
    assert.notEqual(call.model, "bot/model");
  }
});
