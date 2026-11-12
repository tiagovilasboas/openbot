import assert from "node:assert/strict";
import test from "node:test";
import { createSettingsApi } from "./settings-api.ts";

function fakeFetch(
  respond: (url: string, init: RequestInit) => Response | Promise<Response>,
) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond(url, init);
  }) as unknown as typeof fetch;
  return { fn, calls };
}

test("get validates what the server returns and drops the rest", async () => {
  const { fn, calls } = fakeFetch(() =>
    Response.json({
      settings: {
        language: "en",
        memoryEnabled: "yes",
        modelConfig: { provider: "anthropic", model: "m", apiKey: "sk-1" },
        extra: 1,
      },
    }),
  );
  const result = await createSettingsApi(fn).get();
  assert.deepEqual(result, {
    ok: true,
    settings: {
      language: "en",
      modelConfig: { provider: "anthropic", model: "m" },
    },
  });
  assert.equal(calls[0]?.url, "/api/settings");
  assert.equal(calls[0]?.init.method, "GET");
});

test("get on a body without settings is a failure", async () => {
  const { fn } = fakeFetch(() => Response.json({ nope: true }));
  const result = await createSettingsApi(fn).get();
  assert.equal(result.ok, false);
});

test("put sends the patch under settings", async () => {
  const { fn, calls } = fakeFetch(() => Response.json({ settings: {} }));
  const result = await createSettingsApi(fn).put({
    language: "es",
    modelConfig: null,
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0]?.init.method, "PUT");
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), {
    settings: { language: "es", modelConfig: null },
  });
});

test("a refusal carries its status and error code", async () => {
  const { fn } = fakeFetch(() =>
    Response.json(
      { error: "invalid_setting", key: "language" },
      { status: 400 },
    ),
  );
  const result = await createSettingsApi(fn).put({ language: "en" });
  assert.deepEqual(result, {
    ok: false,
    failure: { kind: "http", status: 400, error: "invalid_setting" },
  });
});

test("a network error is a network failure", async () => {
  const fn = (async () => {
    throw new TypeError("offline");
  }) as unknown as typeof fetch;
  const result = await createSettingsApi(fn).get();
  assert.deepEqual(result, { ok: false, failure: { kind: "network" } });
});
