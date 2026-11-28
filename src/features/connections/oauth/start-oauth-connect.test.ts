import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ConnectionId,
  OAuthClientIdentityStore,
  PendingAuth,
  PendingAuthStore,
} from "../core/index.ts";
import { challengeFor } from "./pkce.ts";
import { startOAuthConnect } from "./start-oauth-connect.ts";

const NOW = 1_700_000_000_000;

function fakePending(): PendingAuthStore & {
  entries: Map<string, PendingAuth>;
} {
  const entries = new Map<string, PendingAuth>();
  return {
    entries,
    put: (state, pending) => void entries.set(state, pending),
    take: (state) => entries.get(state) ?? null,
  };
}

function fakeIdentities(
  initialClientId: string | null = null,
): OAuthClientIdentityStore {
  let clientId = initialClientId;
  return {
    readOrCreateHostId: () => "host-uuid-1",
    saveClientId: (_id: ConnectionId, next: string) => {
      clientId = next;
    },
    readClientId: () => clientId,
  };
}

test("start returns the OpenRouter page with the S256 challenge and a state callback", async () => {
  const pending = fakePending();
  const started = await startOAuthConnect(
    { pending, clock: () => NOW },
    "router",
    "http://localhost:3000",
  );
  assert.ok(started.ok);
  const url = new URL(started.authorizeUrl);
  assert.equal(url.origin + url.pathname, "https://openrouter.ai/auth");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");

  const [[state, saved]] = [...pending.entries];
  const expectedRedirectUri = `http://localhost:3000/?connect=router&state=${state}`;
  assert.deepEqual(saved, {
    id: "router",
    verifier: saved.verifier,
    redirectUri: expectedRedirectUri,
    createdAt: NOW,
  });
  assert.equal(
    url.searchParams.get("code_challenge"),
    await challengeFor(saved.verifier),
  );
  const callback = new URL(url.searchParams.get("callback_url") ?? "");
  assert.equal(callback.origin, "http://localhost:3000");
  assert.equal(callback.searchParams.get("connect"), "router");
  assert.equal(callback.searchParams.get("state"), state);
  // The verifier is the PKCE secret: it never travels in the URL.
  assert.ok(!started.authorizeUrl.includes(saved.verifier));
});

test("start returns the ChatGPT SIWC authorize page on loopback and saves redirectUri and nonce", async () => {
  const pending = fakePending();
  const started = await startOAuthConnect(
    { pending, clock: () => NOW, clientIdentities: fakeIdentities() },
    "chatgpt",
    "http://127.0.0.1:3000",
  );
  assert.ok(started.ok);
  const url = new URL(started.authorizeUrl);
  assert.equal(
    url.origin + url.pathname,
    "https://auth.openai.com/api/accounts/authorize",
  );
  assert.equal(url.searchParams.get("client_id"), "dynamic_agent_client");
  assert.equal(url.searchParams.get("ext_agent_host_id"), "host-uuid-1");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "http://127.0.0.1:3000/?connect=chatgpt",
  );

  const [[state, saved]] = [...pending.entries];
  assert.equal(saved.id, "chatgpt");
  assert.equal(saved.redirectUri, "http://127.0.0.1:3000/?connect=chatgpt");
  assert.ok(saved.nonce);
  assert.equal(url.searchParams.get("state"), state);
  assert.equal(url.searchParams.get("nonce"), saved.nonce);
});

test("start is refused where OAuth cannot call back, lacks identities, or has no OAuth", async () => {
  for (const [id, origin] of [
    ["router", "http://192.168.0.10:3000"],
    ["chatgpt", "https://bot.example"],
    ["chatgpt", "http://192.168.0.10:3000"],
    ["anthropic", "https://bot.example"],
    ["github", "https://bot.example"],
  ] as const) {
    const pending = fakePending();
    const started = await startOAuthConnect(
      { pending, clock: () => NOW, clientIdentities: fakeIdentities() },
      id,
      origin,
    );
    assert.deepEqual(started, { ok: false, error: "oauth_unavailable" }, id);
    assert.equal(pending.entries.size, 0);
  }

  const pending = fakePending();
  const missingIdentities = await startOAuthConnect(
    { pending, clock: () => NOW },
    "chatgpt",
    "http://localhost:3000",
  );
  assert.deepEqual(missingIdentities, {
    ok: false,
    error: "oauth_unavailable",
  });
  assert.equal(pending.entries.size, 0);
});
