import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteAllSavedKeys,
  fetchSavedKeys,
  hasSavedKeyFor,
  putSavedKey,
} from "./saved-keys-api.ts";

type Call = { url: string; init: RequestInit };

function stubFetch(status: number, body?: unknown) {
  const calls: Call[] = [];
  const impl = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return Response.json(body ?? {}, { status });
  }) as unknown as typeof fetch;
  return { calls, impl };
}

test("saving sends the key once to /api/keys and reports 200", async () => {
  const { calls, impl } = stubFetch(200, {});
  const input = {
    provider: "router" as const,
    origin: "https://openrouter.ai",
    key: "sk-or-1",
  };
  assert.equal(await putSavedKey(input, impl), true);
  assert.equal(calls[0].url, "/api/keys");
  assert.equal(calls[0].init.method, "PUT");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), input);
});

test("a rejected or unreachable save reports false", async () => {
  assert.equal(
    await putSavedKey(
      { provider: "router", origin: "https://openrouter.ai", key: "k" },
      stubFetch(400).impl,
    ),
    false,
  );
  const broken = (async () => {
    throw new Error("down");
  }) as unknown as typeof fetch;
  assert.equal(
    await putSavedKey(
      { provider: "router", origin: "https://openrouter.ai", key: "k" },
      broken,
    ),
    false,
  );
});

test("the saved list is read by provider and never has a value", async () => {
  const { impl } = stubFetch(200, {
    keys: [
      { provider: "router", origin: "https://openrouter.ai", updatedAt: 5 },
      { provider: "bogus", origin: "https://x.test", updatedAt: 1 },
    ],
  });
  const saved = await fetchSavedKeys(impl);
  assert.deepEqual(Object.keys(saved ?? {}), ["router"]);
  assert.equal(await fetchSavedKeys(stubFetch(500).impl), null);
});

test("a key counts only for the exact origin it was saved for", () => {
  const saved = {
    router: {
      provider: "router" as const,
      origin: "https://openrouter.ai",
      updatedAt: 1,
    },
  };
  assert.equal(hasSavedKeyFor(saved, "router", "https://openrouter.ai"), true);
  assert.equal(hasSavedKeyFor(saved, "router", "https://other.test"), false);
  assert.equal(hasSavedKeyFor(saved, "router", null), false);
  assert.equal(
    hasSavedKeyFor(saved, "anthropic", "https://openrouter.ai"),
    false,
  );
});

test("forgetting everything deletes each provider's key", async () => {
  const { calls, impl } = stubFetch(204);
  await deleteAllSavedKeys(impl);
  assert.deepEqual(calls.map((call) => call.url).sort(), [
    "/api/keys?provider=anthropic",
    "/api/keys?provider=router",
  ]);
  assert.ok(calls.every((call) => call.init.method === "DELETE"));
});
