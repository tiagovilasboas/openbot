import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import "../../../shared/testing/register-alias-resolver.mjs";
import "../../../shared/testing/temp-data-dir.mjs";

const { POST } = await import("./route.ts");

const realFetch = globalThis.fetch;
let savedAllowed: string | undefined;

beforeEach(() => {
  savedAllowed = process.env.OPENBOT_ALLOWED_MODELS;
  delete process.env.OPENBOT_ALLOWED_MODELS;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  if (savedAllowed === undefined) delete process.env.OPENBOT_ALLOWED_MODELS;
  else process.env.OPENBOT_ALLOWED_MODELS = savedAllowed;
});

function post(extra: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        language: "en",
        messages: [{ role: "user", text: "hello" }],
        config: {
          provider: "router",
          baseUrl: "https://router.test/v1",
          model: "vendor/global",
          apiKey: "client-key",
        },
        ...extra,
      }),
    }),
  );
}

function captureModels(): string[] {
  const models: string[] = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    models.push(JSON.parse(String(init?.body)).model);
    return Response.json({ choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;
  return models;
}

test("without an allow-list any well-formed modelId reaches the provider", async () => {
  const models = captureModels();
  const response = await post({ modelId: "vendor/bot-model" });
  assert.equal(response.status, 200);
  assert.deepEqual(models, ["vendor/bot-model"]);
});

test("without a modelId the configured model is used", async () => {
  const models = captureModels();
  await post({});
  assert.deepEqual(models, ["vendor/global"]);
});

test("a modelId inside the allow-list passes", async () => {
  process.env.OPENBOT_ALLOWED_MODELS = "vendor/a, vendor/bot-model";
  const models = captureModels();
  const response = await post({ modelId: "vendor/bot-model" });
  assert.equal(response.status, 200);
  assert.deepEqual(models, ["vendor/bot-model"]);
});

test("a modelId outside the allow-list is a 400 model_not_allowed and no provider call", async () => {
  process.env.OPENBOT_ALLOWED_MODELS = "vendor/a";
  const models = captureModels();
  const response = await post({ modelId: "vendor/other" });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "model_not_allowed" });
  assert.deepEqual(models, []);
});

test("the allow-list does not block calls that carry no modelId", async () => {
  process.env.OPENBOT_ALLOWED_MODELS = "vendor/a";
  const models = captureModels();
  const response = await post({});
  assert.equal(response.status, 200);
  assert.deepEqual(models, ["vendor/global"]);
});

test("a malformed modelId is an invalid request, whatever the allow-list", async () => {
  const response = await post({ modelId: "not a model" });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_request" });
});
