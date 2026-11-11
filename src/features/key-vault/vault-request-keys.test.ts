import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import "../../shared/testing/temp-data-dir.mjs";

// Through the real route handlers, a real vault in a throwaway data folder
// and a stubbed provider: the key comes from the vault, for its origin only.
const { POST: chat } = await import("../../app/api/chat/route.ts");
const { POST: stream } = await import("../../app/api/chat/stream/route.ts");
const { saveProviderKey } = await import("./provider-key-repository.ts");
const { getVaultContext } = await import("./vault-context.ts");

const realFetch = globalThis.fetch;
const savedEnv = process.env.ROUTER_API_KEY;
let authorizations: Array<string | null> = [];

beforeEach(() => {
  authorizations = [];
  process.env.ROUTER_API_KEY = "env-key";
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    authorizations.push(new Headers(init?.headers).get("authorization"));
    return Response.json({ choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  if (savedEnv === undefined) delete process.env.ROUTER_API_KEY;
  else process.env.ROUTER_API_KEY = savedEnv;
});

function saveRouterKey(origin: string, key: string) {
  const { db, masterKey } = getVaultContext();
  saveProviderKey(db, masterKey, { provider: "router", origin, key });
}

function body(baseUrl: string) {
  return JSON.stringify({
    language: "en",
    messages: [{ role: "user", text: "hello" }],
    config: { provider: "router", baseUrl, model: "vendor/model-a" },
  });
}

function request(path: string, baseUrl: string) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body(baseUrl),
  });
}

test("a request with no key is served with the vault key for its origin", async () => {
  saveRouterKey("https://router.test", "vault-key");
  const response = await chat(request("/api/chat", "https://router.test/v1"));
  assert.equal(response.status, 200);
  assert.deepEqual(authorizations, ["Bearer vault-key"]);
});

test("the streaming route resolves the vault key too", async () => {
  saveRouterKey("https://router.test", "vault-key");
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    authorizations.push(new Headers(init?.headers).get("authorization"));
    return new Response("data: [DONE]\n\n", {
      headers: { "content-type": "text/event-stream" },
    });
  }) as typeof fetch;
  const response = await stream(
    request("/api/chat/stream", "https://router.test/v1"),
  );
  await response.text();
  // An empty stream may be retried on the failover model; both calls carry it.
  assert.ok(authorizations.length >= 1);
  assert.ok(authorizations.every((value) => value === "Bearer vault-key"));
});

test("the vault key is not released to another origin, nor the env key", async () => {
  saveRouterKey("https://router.test", "vault-key");
  await chat(request("/api/chat", "https://other.test/v1"));
  assert.deepEqual(authorizations, [null]);
});
