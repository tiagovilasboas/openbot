import assert from "node:assert/strict";
import { test } from "node:test";
import type { PendingAuth, PendingAuthStore } from "../core/index.ts";
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
  assert.deepEqual(saved, {
    id: "router",
    verifier: saved.verifier,
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

test("start is refused where OAuth cannot call back or the service has no OAuth", async () => {
  for (const [id, origin] of [
    ["router", "http://192.168.0.10:3000"],
    ["anthropic", "https://bot.example"],
    ["github", "https://bot.example"],
  ] as const) {
    const pending = fakePending();
    const started = await startOAuthConnect(
      { pending, clock: () => NOW },
      id,
      origin,
    );
    assert.deepEqual(started, { ok: false, error: "oauth_unavailable" }, id);
    assert.equal(pending.entries.size, 0);
  }
});
