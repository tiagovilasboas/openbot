import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import "../../../shared/testing/register-alias-resolver.mjs";
import "../../../shared/testing/temp-data-dir.mjs";

const { POST: chat } = await import("./route.ts");
const { POST: stream } = await import("./stream/route.ts");
const { POST: tools } = await import("./tools/route.ts");
const { POST: suggest } = await import("../skills/suggest/route.ts");
const { applySettings } =
  await import("../../../features/settings/server/settings-repository.ts");
const { getLocalStore } =
  await import("../../../shared/local-store/local-store.ts");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  applySettings(getLocalStore(), { providersOff: null });
});

const config = {
  provider: "router",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "vendor/model-a",
  apiKey: "client-key",
};

function countModelCalls() {
  const counter = { calls: 0 };
  globalThis.fetch = (async () => {
    counter.calls += 1;
    return Response.json({ choices: [{ message: { content: "hi" } }] });
  }) as typeof fetch;
  return counter;
}

const request = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const chatBody = {
  language: "en",
  messages: [{ role: "user", text: "hello" }],
  config,
};
const suggestBody = {
  language: "en",
  messages: ["one", "two", "three", "four", "five"],
  config,
};

const routes = [
  ["/api/chat", () => chat(request("/api/chat", chatBody))],
  ["/api/chat/stream", () => stream(request("/api/chat/stream", chatBody))],
  ["/api/chat/tools", () => tools(request("/api/chat/tools", chatBody))],
  [
    "/api/skills/suggest",
    () => suggest(request("/api/skills/suggest", suggestBody)),
  ],
] as const;

for (const [path, send] of routes) {
  test(`${path} refuses a provider switched off on the server`, async () => {
    applySettings(getLocalStore(), { providersOff: ["router"] });
    const model = countModelCalls();
    const response = await send();
    assert.equal(response.status, 409);
    const text = await response.text();
    assert.deepEqual(JSON.parse(text), {
      error: "provider_off",
      provider: "router",
    });
    assert.doesNotMatch(text, /client-key/);
    assert.equal(model.calls, 0);
  });
}

test("/api/chat answers again while only another provider is off", async () => {
  applySettings(getLocalStore(), { providersOff: ["anthropic"] });
  const model = countModelCalls();
  const response = await chat(request("/api/chat", chatBody));
  assert.equal(response.status, 200);
  assert.equal(model.calls, 1);
});
