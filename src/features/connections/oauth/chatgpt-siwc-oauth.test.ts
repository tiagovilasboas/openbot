import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ConnectionId,
  OAuthClientIdentityStore,
  PendingAuth,
} from "../core/index.ts";
import {
  CHATGPT_AGENT_NAME_HINT,
  CHATGPT_AUTHORIZE_URL,
  CHATGPT_DYNAMIC_CLIENT_ID,
  CHATGPT_RESOURCE,
  CHATGPT_SIWC_SCOPE,
  CHATGPT_TOKEN_URL,
  chatgptSiwcOAuthProvider,
} from "./chatgpt-siwc-oauth.ts";
import type { HttpClient } from "./oauth-provider.ts";

const NOW = 1_700_000_000_000;

function fakeIdentities(initialClientId: string | null = null) {
  let clientId = initialClientId;
  const savedCalls: Array<{ id: ConnectionId; clientId: string }> = [];
  const store: OAuthClientIdentityStore = {
    readOrCreateHostId: () => "host-uuid-99",
    saveClientId: (id, next) => {
      clientId = next;
      savedCalls.push({ id, clientId: next });
    },
    readClientId: () => clientId,
  };
  return { store, savedCalls, getClientId: () => clientId };
}

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

const deterministicRandom = (size: number) =>
  Uint8Array.from({ length: size }, (_, i) => (i + 1) & 0xff);

test("buildAuthorizeUrl includes all official SIWC parameters and uses dynamic_agent_client when unsaved", () => {
  const { store } = fakeIdentities(null);
  const built = chatgptSiwcOAuthProvider.buildAuthorizeUrl({
    id: "chatgpt",
    origin: "http://localhost:3000",
    state: "state-1",
    challenge: "challenge-1",
    random: deterministicRandom,
    clientIdentities: store,
  });
  assert.ok(built);
  assert.equal(built.redirectUri, "http://localhost:3000/?connect=chatgpt");
  assert.ok(built.nonce);

  const url = new URL(built.authorizeUrl);
  assert.equal(url.origin + url.pathname, CHATGPT_AUTHORIZE_URL);
  assert.equal(url.searchParams.get("client_id"), CHATGPT_DYNAMIC_CLIENT_ID);
  assert.equal(
    url.searchParams.get("agent_name_hint"),
    CHATGPT_AGENT_NAME_HINT,
  );
  assert.equal(url.searchParams.get("ext_agent_host_id"), "host-uuid-99");
  assert.equal(url.searchParams.get("scope"), CHATGPT_SIWC_SCOPE);
  assert.equal(url.searchParams.get("resource"), CHATGPT_RESOURCE);
  assert.equal(url.searchParams.get("code_challenge"), "challenge-1");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), "state-1");
  assert.equal(url.searchParams.get("nonce"), built.nonce);
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "http://localhost:3000/?connect=chatgpt",
  );
  assert.equal(url.searchParams.get("response_type"), "code");
});

test("buildAuthorizeUrl reuses saved client_id when present", () => {
  const { store } = fakeIdentities("oaiapp_saved_1");
  const built = chatgptSiwcOAuthProvider.buildAuthorizeUrl({
    id: "chatgpt",
    origin: "http://127.0.0.1:3801",
    state: "state-2",
    challenge: "challenge-2",
    random: deterministicRandom,
    clientIdentities: store,
  });
  assert.ok(built);
  const url = new URL(built.authorizeUrl);
  assert.equal(url.searchParams.get("client_id"), "oaiapp_saved_1");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "http://127.0.0.1:3801/?connect=chatgpt",
  );
});

test("exchangeCode posts form-urlencoded with stored redirectUri, persists dynamic client_id, and returns oauth-session", async () => {
  const { store, savedCalls, getClientId } = fakeIdentities(null);
  const captured: Array<{ url: string; init: RequestInit }> = [];
  const http: HttpClient = async (url, init) => {
    captured.push({ url, init });
    return Response.json({
      access_token: "at_openai_123",
      refresh_token: "rt_openai_456",
      expires_in: 3600,
      id_token: fakeJwt({
        nonce: "nonce-expected",
        email: "tiago@example.com",
        "https://api.openai.com/auth": { chatgpt_plan_type: "plus" },
      }),
    });
  };
  const pending: PendingAuth = {
    id: "chatgpt",
    verifier: "verifier-secret",
    redirectUri: "http://localhost:3000/?connect=chatgpt",
    nonce: "nonce-expected",
    createdAt: NOW,
  };

  const result = await chatgptSiwcOAuthProvider.exchangeCode({
    id: "chatgpt",
    http,
    clock: () => NOW,
    code: "auth-code-1",
    pending,
    clientId: "oaiapp_issued_99",
    clientIdentities: store,
  });

  assert.equal(captured.length, 1);
  assert.equal(captured[0].url, CHATGPT_TOKEN_URL);
  assert.equal(captured[0].init.method, "POST");
  assert.equal(captured[0].init.redirect, "error");
  assert.ok(captured[0].init.signal instanceof AbortSignal);
  const headers = captured[0].init.headers as Record<string, string>;
  assert.equal(headers["content-type"], "application/x-www-form-urlencoded");

  const body = new URLSearchParams(String(captured[0].init.body));
  assert.equal(body.get("grant_type"), "authorization_code");
  assert.equal(body.get("code"), "auth-code-1");
  assert.equal(
    body.get("redirect_uri"),
    "http://localhost:3000/?connect=chatgpt",
  );
  assert.equal(body.get("code_verifier"), "verifier-secret");
  assert.equal(body.get("client_id"), "oaiapp_issued_99");

  assert.deepEqual(savedCalls, [
    { id: "chatgpt", clientId: "oaiapp_issued_99" },
  ]);
  assert.equal(getClientId(), "oaiapp_issued_99");

  assert.deepEqual(result, {
    ok: true,
    credential: {
      kind: "oauth-session",
      accessToken: "at_openai_123",
      refreshToken: "rt_openai_456",
      expiresAt: NOW + 3_600_000,
      clientId: "oaiapp_issued_99",
      hostId: "host-uuid-99",
      accountLabel: "tiago@example.com",
    },
  });
});

test("exchangeCode extracts plan label from JWT when email is absent and rejects nonce mismatch", async () => {
  const { store } = fakeIdentities("oaiapp_existing");
  const pending: PendingAuth = {
    id: "chatgpt",
    verifier: "v",
    redirectUri: "http://localhost:3000/?connect=chatgpt",
    nonce: "expected-nonce",
    createdAt: NOW,
  };

  const mismatch = await chatgptSiwcOAuthProvider.exchangeCode({
    id: "chatgpt",
    http: async () =>
      Response.json({
        access_token: "at_1",
        id_token: fakeJwt({ nonce: "wrong-nonce", email: "x@y.com" }),
      }),
    clock: () => NOW,
    code: "c1",
    pending,
    clientIdentities: store,
  });
  assert.deepEqual(mismatch, { ok: false, reason: "invalid_key" });

  const planOnly = await chatgptSiwcOAuthProvider.exchangeCode({
    id: "chatgpt",
    http: async () =>
      Response.json({
        access_token: fakeJwt({
          "https://api.openai.com/auth": { chatgpt_plan_type: "Plus" },
        }),
      }),
    clock: () => NOW,
    code: "c1",
    pending,
    clientIdentities: store,
  });
  assert.ok(planOnly.ok);
  assert.equal(planOnly.credential.kind, "oauth-session");
  if (planOnly.credential.kind === "oauth-session") {
    assert.equal(planOnly.credential.accountLabel, "Plus");
    assert.equal(planOnly.credential.clientId, "oaiapp_existing");
  }
});

test("exchangeCode maps 4xx/malformed to invalid_key and 5xx/throws to network", async () => {
  const pending: PendingAuth = {
    id: "chatgpt",
    verifier: "v",
    redirectUri: "http://localhost:3000/?connect=chatgpt",
    createdAt: NOW,
  };

  for (const http of [
    async () => Response.json({ error: "invalid_grant" }, { status: 400 }),
    async () => Response.json({ token_type: "Bearer" }),
    async () => new Response("not-json", { status: 200 }),
  ] satisfies HttpClient[]) {
    const res = await chatgptSiwcOAuthProvider.exchangeCode({
      id: "chatgpt",
      http,
      clock: () => NOW,
      code: "c1",
      pending,
    });
    assert.deepEqual(res, { ok: false, reason: "invalid_key" });
  }

  for (const http of [
    async () => new Response("down", { status: 503 }),
    async () => {
      throw new Error("socket closed");
    },
  ] satisfies HttpClient[]) {
    const res = await chatgptSiwcOAuthProvider.exchangeCode({
      id: "chatgpt",
      http,
      clock: () => NOW,
      code: "c1",
      pending,
    });
    assert.deepEqual(res, { ok: false, reason: "network" });
  }
});
