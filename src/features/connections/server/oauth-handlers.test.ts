import assert from "node:assert/strict";
import { test } from "node:test";
import type { ConnectionId, CredentialStore } from "../core/index.ts";
import { createMemoryPendingAuthStore } from "../credentials/index.ts";
import { PENDING_TTL_MS, type FinishOAuthDeps } from "../oauth/index.ts";
import { handleCallback, handleStart } from "./oauth-handlers.ts";

const KEY = "sk-or-v1-OAUTH-SECRET-0123456789";
const APP = "http://localhost:3000";

function setup() {
  let now = 1_700_000_000_000;
  const clock = () => now;
  const saved = new Map<ConnectionId, string>();
  const credentials: CredentialStore = {
    save: async (id, credential) => void saved.set(id, credential),
    remove: async (id) => void saved.delete(id),
    status: async () => ({ connected: false, updatedAt: null }),
  };
  const deps: FinishOAuthDeps = {
    clock,
    pending: createMemoryPendingAuthStore(clock, PENDING_TTL_MS * 2),
    http: async () => Response.json({ key: KEY, user_id: "u1" }),
    credentials,
  };
  const advance = (ms: number) => void (now += ms);
  return { deps, saved, advance };
}

const post = (path: string, body?: unknown) =>
  new Request(`${APP}${path}`, {
    method: "POST",
    headers: { origin: APP, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function start(deps: FinishOAuthDeps): Promise<string> {
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

const finish = (deps: FinishOAuthDeps, body: unknown) =>
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
  assert.equal(saved.get("router"), KEY);
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
