import assert from "node:assert/strict";
import test from "node:test";
import { MODEL_CONFIG_STORAGE_KEY } from "../model/model-config.ts";
import { PROVIDER_KEYS_STORAGE_KEY } from "../model/provider-keys.ts";
import { migrateLocalKeys, type PutKey } from "./migrate-local-keys.ts";

function memoryStorage(initial: Record<string, string>) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  };
}

const recorder = (accept: (provider: string) => boolean) => {
  const calls: Array<{ provider: string; origin: string; key: string }> = [];
  const put: PutKey = async (input) => {
    calls.push(input);
    return accept(input.provider);
  };
  return { calls, put };
};

const config = {
  provider: "router",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "openrouter/free",
  apiKey: "sk-or-1",
};

test("a saved key leaves the browser after the server says 200", async () => {
  const storage = memoryStorage({
    [PROVIDER_KEYS_STORAGE_KEY]: JSON.stringify({
      router: "sk-or-1",
      anthropic: "sk-ant-1",
    }),
    [MODEL_CONFIG_STORAGE_KEY]: JSON.stringify(config),
  });
  const { calls, put } = recorder(() => true);
  const result = await migrateLocalKeys(storage, put);

  assert.deepEqual(result, { migrated: 2, failed: 0 });
  assert.deepEqual(calls, [
    { provider: "router", origin: "https://openrouter.ai", key: "sk-or-1" },
    {
      provider: "anthropic",
      origin: "https://api.anthropic.com",
      key: "sk-ant-1",
    },
  ]);
  assert.equal(storage.getItem(PROVIDER_KEYS_STORAGE_KEY), null);
  const stored = JSON.parse(storage.getItem(MODEL_CONFIG_STORAGE_KEY) ?? "{}");
  assert.equal("apiKey" in stored, false);
  assert.equal(stored.model, "openrouter/free");
});

test("a failed key stays in place and the others still move", async () => {
  const storage = memoryStorage({
    [PROVIDER_KEYS_STORAGE_KEY]: JSON.stringify({
      router: "sk-or-1",
      anthropic: "sk-ant-1",
    }),
  });
  const { put } = recorder((provider) => provider === "anthropic");
  const result = await migrateLocalKeys(storage, put);

  assert.deepEqual(result, { migrated: 1, failed: 1 });
  assert.deepEqual(
    JSON.parse(storage.getItem(PROVIDER_KEYS_STORAGE_KEY) ?? "{}"),
    { router: "sk-or-1" },
  );
});

test("when every save fails, nothing is touched and a later load retries", async () => {
  const before = {
    [PROVIDER_KEYS_STORAGE_KEY]: JSON.stringify({ router: "sk-or-1" }),
    [MODEL_CONFIG_STORAGE_KEY]: JSON.stringify(config),
  };
  const storage = memoryStorage(before);
  const failing = recorder(() => false);
  assert.deepEqual(await migrateLocalKeys(storage, failing.put), {
    migrated: 0,
    failed: 1,
  });
  assert.deepEqual(Object.fromEntries(storage.map), before);

  const working = recorder(() => true);
  assert.equal((await migrateLocalKeys(storage, working.put)).migrated, 1);
});

test("a key inside a custom router config keeps that config's origin", async () => {
  const storage = memoryStorage({
    [MODEL_CONFIG_STORAGE_KEY]: JSON.stringify({
      ...config,
      baseUrl: "http://localhost:20128/v1",
    }),
  });
  const { calls, put } = recorder(() => true);
  await migrateLocalKeys(storage, put);
  assert.equal(calls[0].origin, "http://localhost:20128");
});

test("an Anthropic config key moves and the config stays usable", async () => {
  const storage = memoryStorage({
    [MODEL_CONFIG_STORAGE_KEY]: JSON.stringify({
      provider: "anthropic",
      apiKey: "sk-ant-1",
      model: "claude-sonnet-5-5",
    }),
  });
  const { calls, put } = recorder(() => true);
  await migrateLocalKeys(storage, put);
  assert.equal(calls[0].origin, "https://api.anthropic.com");
  assert.deepEqual(
    JSON.parse(storage.getItem(MODEL_CONFIG_STORAGE_KEY) ?? ""),
    {
      provider: "anthropic",
      model: "claude-sonnet-5-5",
    },
  );
});

test("nothing to migrate makes no calls", async () => {
  const storage = memoryStorage({
    [PROVIDER_KEYS_STORAGE_KEY]: "{not json",
    [MODEL_CONFIG_STORAGE_KEY]: JSON.stringify({
      provider: "local",
      baseUrl: "http://localhost:11434",
      model: "llama3",
    }),
  });
  const { calls, put } = recorder(() => true);
  assert.deepEqual(await migrateLocalKeys(storage, put), {
    migrated: 0,
    failed: 0,
  });
  assert.equal(calls.length, 0);
});
