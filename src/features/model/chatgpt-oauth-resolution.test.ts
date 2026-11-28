import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import "../../shared/testing/temp-data-dir.mjs";
import { getVaultContext } from "../key-vault/vault-context.ts";
import { saveOAuthSession } from "../key-vault/oauth-session-repository.ts";
import { createStreamSlots } from "../server-guard/stream-slots.ts";
import {
  readEvents,
  routerSse,
  streamResponse,
} from "../../shared/testing/stream-fixtures.ts";
import { answerChatRequest } from "./answer-chat-request.ts";
import { handleChatStream } from "./stream-chat-handler.ts";

const { POST: testModelPost } =
  await import("../../app/api/model/test/route.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function streamChatRequest(): Request {
  return new Request("http://localhost/api/chat/stream", {
    method: "POST",
    body: JSON.stringify({
      language: "en",
      messages: [{ role: "user", text: "hi" }],
      config: { provider: "chatgpt", model: "gpt-4o" },
    }),
  });
}

test("stream handler resolves chatgpt OAuth before taking a slot and fails closed on reauth_required", async () => {
  for (const reason of ["reauth_required", "missing_session"] as const) {
    const slots = createStreamSlots({ perClient: 1, global: 5 });
    let fetchCalls = 0;
    const response = await handleChatStream(streamChatRequest(), {
      env: {},
      slots,
      oauthLookup: async () => ({ ok: false, reason }),
      fetchImpl: async () => {
        fetchCalls += 1;
        return new Response("{}");
      },
    });
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.deepEqual(body, { error: reason, provider: "chatgpt" });
    assert.equal(slots.open(), 0);
    assert.equal(fetchCalls, 0);
  }
});

test("stream handler streams chatgpt response using resolved OAuth token", async () => {
  let seenAuth: string | undefined;
  let seenUrl: string | undefined;
  const response = await handleChatStream(streamChatRequest(), {
    env: {},
    oauthLookup: async () => ({
      ok: true,
      accessToken: "oauth-token-123",
      refreshed: false,
    }),
    fetchImpl: async (url, init) => {
      seenUrl = String(url);
      seenAuth = (init?.headers as Record<string, string>).authorization;
      return streamResponse(routerSse(["Hello"]));
    },
  });
  assert.equal(response.status, 200);
  const events = await readEvents(response);
  assert.equal(events[0]?.type, "start");
  assert.equal(seenUrl, "https://api.openai.com/v1/chat/completions");
  assert.equal(seenAuth, "Bearer oauth-token-123");
});

test("answerChatRequest resolves chatgpt OAuth and fails closed without upstream call", async () => {
  const denied = await answerChatRequest(
    {
      language: "en",
      messages: [{ role: "user", text: "hi" }],
      config: { provider: "chatgpt", model: "gpt-4o" },
    },
    { oauthLookup: async () => ({ ok: false, reason: "reauth_required" }) },
  );
  assert.deepEqual(denied, {
    status: 401,
    body: { error: "reauth_required", provider: "chatgpt" },
  });

  let seenAuth: string | undefined;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    seenAuth = (init?.headers as Record<string, string>).authorization;
    return Response.json({ choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;

  const allowed = await answerChatRequest(
    {
      language: "en",
      messages: [{ role: "user", text: "hi" }],
      config: { provider: "chatgpt", model: "gpt-4o" },
    },
    {
      oauthLookup: async () => ({
        ok: true,
        accessToken: "oauth-answer-token",
        refreshed: false,
      }),
    },
  );
  assert.equal(allowed.status, 200);
  assert.equal(seenAuth, "Bearer oauth-answer-token");
});

test("POST /api/model/test uses vault OAuth token and fails closed when reauth is required", async () => {
  const { db, masterKey } = getVaultContext();
  saveOAuthSession(db, masterKey, {
    provider: "chatgpt",
    origin: "https://api.openai.com",
    session: {
      accessToken: "vault-siwc-secret",
      refreshToken: "rt-1",
      expiresAt: Date.now() + 300_000,
      needsReauth: true,
    },
  });

  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return Response.json({ choices: [{ message: { content: "pong" } }] });
  }) as typeof fetch;

  const blocked = await testModelPost(
    new Request("http://localhost/api/model/test", {
      method: "POST",
      body: JSON.stringify({
        config: { provider: "chatgpt", model: "gpt-4o" },
      }),
    }),
  );
  assert.equal(blocked.status, 401);
  const blockedText = await blocked.text();
  assert.deepEqual(JSON.parse(blockedText), {
    ok: false,
    error: "reauth_required",
    provider: "chatgpt",
  });
  assert.equal(fetchCalls, 0);
  assert.ok(!blockedText.includes("vault-siwc-secret"));

  saveOAuthSession(db, masterKey, {
    provider: "chatgpt",
    origin: "https://api.openai.com",
    session: {
      accessToken: "vault-siwc-secret",
      refreshToken: "rt-1",
      expiresAt: Date.now() + 300_000,
      needsReauth: false,
    },
  });

  let seenAuth: string | undefined;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    seenAuth = (init?.headers as Record<string, string>).authorization;
    return Response.json({ choices: [{ message: { content: "pong" } }] });
  }) as typeof fetch;

  const ok = await testModelPost(
    new Request("http://localhost/api/model/test", {
      method: "POST",
      body: JSON.stringify({
        config: { provider: "chatgpt", model: "gpt-4o" },
      }),
    }),
  );
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), {
    ok: true,
    provider: "chatgpt",
    model: "gpt-4o",
  });
  assert.equal(seenAuth, "Bearer vault-siwc-secret");
});
