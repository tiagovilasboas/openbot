import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ConnectCredential,
  ConnectionId,
  CredentialStore,
  OAuthClientIdentityStore,
} from "../core/index.ts";
import { createMemoryPendingAuthStore } from "../credentials/index.ts";
import { PENDING_TTL_MS, type HttpClient } from "../oauth/index.ts";
import type { ConnectionsDeps } from "./connections-deps.ts";
import { handleCallback, handleStart } from "./oauth-handlers.ts";

const KEY = "sk-or-v1-OAUTH-SECRET-0123456789";
const APP = "http://localhost:3000";

function setup(
  http: HttpClient = async () => Response.json({ key: KEY, user_id: "u1" }),
) {
  let now = 1_700_000_000_000;
  const clock = () => now;
  const saved = new Map<ConnectionId, ConnectCredential>();
  const credentials: CredentialStore = {
    save: async (id, credential) => void saved.set(id, credential),
    remove: async (id) => void saved.delete(id),
    status: async () => ({ connected: false, updatedAt: null }),
  };
  let savedClientId: string | null = null;
  const clientIdentities: OAuthClientIdentityStore = {
    readOrCreateHostId: () => "host-uuid-1",
    saveClientId: (_id, clientId) => {
      savedClientId = clientId;
    },
    readClientId: () => savedClientId,
  };
  const deps: ConnectionsDeps = {
    clock,
    pending: createMemoryPendingAuthStore(clock, PENDING_TTL_MS * 2),
    http,
    credentials,
    clientIdentities,
  };
  const advance = (ms: number) => void (now += ms);
  return { deps, saved, advance, getClientId: () => savedClientId };
}

const post = (path: string, body?: unknown) =>
  new Request(`${APP}${path}`, {
    method: "POST",
    headers: { origin: APP, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function start(deps: ConnectionsDeps): Promise<string> {
  const response = await handleStart(
    post("/api/connections/router/start"),
    "router",
    deps,
  );
  assert.equal(response.status, 200);
  const { authorizeUrl } = (await response.json()) as { authorizeUrl: string };
  const callback = new URL(
    new URL(authorizeUrl).searchParams.get("callback_url") ?? "",
  );
  return callback.searchParams.get("state") ?? "";
}

const finish = (deps: ConnectionsDeps, body: unknown) =>
  handleCallback(
    post("/api/connections/router/callback", body),
    "router",
    deps,
  );

test("start then callback saves the key and answers without it", async () => {
  const { deps, saved } = setup();
  const state = await start(deps);
  const response = await finish(deps, { state, code: "c1" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const text = await response.text();
  assert.deepEqual(JSON.parse(text), { status: "connected" });
  assert.ok(!text.includes(KEY));
  assert.deepEqual(saved.get("router"), { kind: "api-key", secret: KEY });
});

test("chatgpt start then callback persists oauth session and client_id without leaking secrets", async () => {
  const { deps, saved, getClientId } = setup(async () =>
    Response.json({
      access_token: "at_chatgpt_secret",
      refresh_token: "rt_chatgpt_secret",
      expires_in: 3600,
    }),
  );

  const started = await handleStart(
    post("/api/connections/chatgpt/start"),
    "chatgpt",
    deps,
  );
  assert.equal(started.status, 200);
  const { authorizeUrl } = (await started.json()) as { authorizeUrl: string };
  const authUrl = new URL(authorizeUrl);
  const state = authUrl.searchParams.get("state") ?? "";
  assert.ok(state);

  const response = await handleCallback(
    post("/api/connections/chatgpt/callback", {
      state,
      code: "c1",
      client_id: "oaiapp_dynamic_1",
    }),
    "chatgpt",
    deps,
  );
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.deepEqual(JSON.parse(text), { status: "connected" });
  assert.ok(!text.includes("at_chatgpt_secret"));
  assert.ok(!text.includes("rt_chatgpt_secret"));
  assert.ok(!text.includes("oaiapp_dynamic_1"));

  assert.equal(getClientId(), "oaiapp_dynamic_1");
  const session = saved.get("chatgpt");
  assert.equal(session?.kind, "oauth-session");
  if (session?.kind === "oauth-session") {
    assert.equal(session.accessToken, "at_chatgpt_secret");
    assert.equal(session.refreshToken, "rt_chatgpt_secret");
    assert.equal(session.clientId, "oaiapp_dynamic_1");
    assert.equal(session.hostId, "host-uuid-1");
  }
});

test("start is refused for an origin OAuth cannot call back to", async () => {
  const { deps } = setup();
  const request = new Request(
    "http://192.168.0.10:3000/api/connections/router/start",
    {
      method: "POST",
      headers: { origin: "http://192.168.0.10:3000" },
    },
  );
  const response = await handleStart(request, "router", deps);
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "oauth_unavailable" });

  const chatgptHttps = new Request(
    "https://bot.example.com/api/connections/chatgpt/start",
    {
      method: "POST",
      headers: { origin: "https://bot.example.com" },
    },
  );
  const chatgptRes = await handleStart(chatgptHttps, "chatgpt", deps);
  assert.equal(chatgptRes.status, 409);
  assert.deepEqual(await chatgptRes.json(), { error: "oauth_unavailable" });
});

test("an unknown connection is a 404", async () => {
  const { deps } = setup();
  assert.equal((await handleStart(post("/x"), "dropbox", deps)).status, 404);
  assert.equal(
    (await handleCallback(post("/x", {}), "dropbox", deps)).status,
    404,
  );
});

test("callback failures map to their status codes", async () => {
  const { deps, advance, saved } = setup();
  const mismatch = await finish(deps, { state: "forged", code: "c1" });
  assert.equal(mismatch.status, 400);
  assert.deepEqual(await mismatch.json(), {
    status: "failed",
    reason: "state_mismatch",
  });

  const denied = await finish(deps, {
    state: await start(deps),
    error: "access_denied",
  });
  assert.deepEqual(await denied.json(), { status: "failed", reason: "denied" });

  const late = await start(deps);
  advance(PENDING_TTL_MS + 1);
  const expired = await finish(deps, { state: late, code: "c1" });
  assert.equal(expired.status, 410);
  assert.deepEqual(await expired.json(), { status: "expired" });

  const invalid = await handleCallback(
    new Request(`${APP}/x`, { method: "POST", body: "not json" }),
    "router",
    deps,
  );
  assert.equal(invalid.status, 400);
  assert.equal(saved.size, 0);
});
