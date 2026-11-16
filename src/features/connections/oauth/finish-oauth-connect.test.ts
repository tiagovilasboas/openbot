import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ConnectionId,
  CredentialStore,
  PendingAuth,
  PendingAuthStore,
} from "../core/index.ts";
import {
  finishOAuthConnect,
  PENDING_TTL_MS,
  type FinishOAuthDeps,
} from "./finish-oauth-connect.ts";
import type { HttpClient } from "./openrouter-oauth.ts";

const NOW = 1_700_000_000_000;
const KEY = "sk-or-v1-OAUTH-SECRET-0123456789";
const STATE = "state-1";

type Call = { url: string; body: unknown };

function setup(reply: () => Promise<Response>, createdAt = NOW) {
  const entries = new Map<string, PendingAuth>([
    [STATE, { id: "router", verifier: "the-verifier", createdAt }],
  ]);
  const pending: PendingAuthStore = {
    put: (state, value) => void entries.set(state, value),
    take: (state) => {
      const value = entries.get(state) ?? null;
      entries.delete(state);
      return value;
    },
  };
  const calls: Call[] = [];
  const http: HttpClient = async (url, init) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return reply();
  };
  const saved = new Map<ConnectionId, string>();
  const credentials: CredentialStore = {
    save: async (id, credential) => void saved.set(id, credential),
    remove: async (id) => void saved.delete(id),
    status: async () => ({ connected: false, updatedAt: null }),
  };
  const deps: FinishOAuthDeps = {
    pending,
    clock: () => NOW,
    http,
    credentials,
  };
  return { deps, calls, saved };
}

const keyReply = () =>
  Promise.resolve(Response.json({ key: KEY, user_id: "u1" }));
const callback = (extra: {
  code?: string;
  error?: string;
  state?: string;
}) => ({
  state: extra.state ?? STATE,
  code: extra.code ?? null,
  error: extra.error ?? null,
});

test("a valid callback exchanges the code and saves the key, never returning it", async () => {
  const { deps, calls, saved } = setup(keyReply);
  const outcome = await finishOAuthConnect(
    deps,
    "router",
    callback({ code: "c1" }),
  );
  assert.deepEqual(outcome, { status: "connected" });
  assert.deepEqual(calls, [
    {
      url: "https://openrouter.ai/api/v1/auth/keys",
      body: {
        code: "c1",
        code_verifier: "the-verifier",
        code_challenge_method: "S256",
      },
    },
  ]);
  assert.equal(saved.get("router"), KEY);
  assert.ok(!JSON.stringify(outcome).includes(KEY));
});

test("a state is taken once, so a replayed callback is a mismatch", async () => {
  const { deps, calls } = setup(keyReply);
  await finishOAuthConnect(deps, "router", callback({ code: "c1" }));
  const replay = await finishOAuthConnect(
    deps,
    "router",
    callback({ code: "c1" }),
  );
  assert.deepEqual(replay, { status: "failed", reason: "state_mismatch" });
  assert.equal(calls.length, 1);
});

test("an unknown, missing or other-service state is a mismatch", async () => {
  for (const [id, state] of [
    ["router", "other-state"],
    ["router", ""],
    ["anthropic", STATE],
  ] as const) {
    const { deps, calls } = setup(keyReply);
    const outcome = await finishOAuthConnect(
      deps,
      id,
      callback({ code: "c1", state }),
    );
    assert.deepEqual(outcome, { status: "failed", reason: "state_mismatch" });
    assert.equal(calls.length, 0);
  }
});

test("a callback after ten minutes is expired and exchanges nothing", async () => {
  const { deps, calls } = setup(keyReply, NOW - PENDING_TTL_MS - 1);
  const outcome = await finishOAuthConnect(
    deps,
    "router",
    callback({ code: "c1" }),
  );
  assert.deepEqual(outcome, { status: "expired" });
  assert.equal(calls.length, 0);
});

test("a declined sign-in, or one without a code, is denied", async () => {
  for (const extra of [{ error: "access_denied" }, {}]) {
    const { deps, calls } = setup(keyReply);
    const outcome = await finishOAuthConnect(deps, "router", callback(extra));
    assert.deepEqual(outcome, { status: "failed", reason: "denied" });
    assert.equal(calls.length, 0);
  }
});

test("a refused or malformed exchange is an invalid key; nothing is saved", async () => {
  for (const reply of [
    () =>
      Promise.resolve(Response.json({ error: "bad code" }, { status: 400 })),
    () => Promise.resolve(Response.json({ user_id: "u1" })),
    () => Promise.resolve(new Response("not json")),
  ]) {
    const { deps, saved } = setup(reply);
    const outcome = await finishOAuthConnect(
      deps,
      "router",
      callback({ code: "bad" }),
    );
    assert.deepEqual(outcome, { status: "failed", reason: "invalid_key" });
    assert.equal(saved.size, 0);
  }
});

test("an unreachable or failing provider is a network failure", async () => {
  for (const reply of [
    () => Promise.reject(new Error("offline")),
    () => Promise.resolve(new Response("down", { status: 503 })),
  ]) {
    const { deps } = setup(reply);
    const outcome = await finishOAuthConnect(
      deps,
      "router",
      callback({ code: "c1" }),
    );
    assert.deepEqual(outcome, { status: "failed", reason: "network" });
  }
});

test("a store that cannot save makes the Connect unavailable", async () => {
  const { deps } = setup(keyReply);
  deps.credentials.save = () => Promise.reject(new Error("vault locked"));
  const outcome = await finishOAuthConnect(
    deps,
    "router",
    callback({ code: "c1" }),
  );
  assert.deepEqual(outcome, { status: "failed", reason: "unavailable" });
});
