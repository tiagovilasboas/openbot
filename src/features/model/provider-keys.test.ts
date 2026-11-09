import assert from "node:assert/strict";
import test from "node:test";
import { MODEL_CONFIG_STORAGE_KEY } from "./model-config.ts";
import {
  PROVIDER_KEYS_STORAGE_KEY,
  clearProviderKeys,
  loadProviderKeys,
  sanitizeProviderKeys,
  saveProviderKey,
  seedKeysFromConfig,
} from "./provider-keys.ts";

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    length: 0,
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: () => null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

const routerConfig = {
  provider: "router",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "meta-llama/llama-3.3-70b-instruct:free",
  apiKey: "sk-or-saved",
} as const;

test("sanitizeProviderKeys keeps known providers with usable keys", () => {
  assert.deepEqual(
    sanitizeProviderKeys({
      router: "  sk-or-1  ",
      anthropic: "",
      local: "nope",
      github: "ghp_x",
    }),
    { router: "sk-or-1" },
  );
  assert.deepEqual(sanitizeProviderKeys({ router: "x".repeat(501) }), {});
  assert.deepEqual(sanitizeProviderKeys(null), {});
  assert.deepEqual(sanitizeProviderKeys("sk"), {});
});

test("seedKeysFromConfig adds the active key only when missing", () => {
  assert.deepEqual(seedKeysFromConfig({}, routerConfig), {
    router: "sk-or-saved",
  });
  assert.deepEqual(seedKeysFromConfig({ router: "sk-or-new" }, routerConfig), {
    router: "sk-or-new",
  });
  assert.deepEqual(
    seedKeysFromConfig(
      {},
      { provider: "local", baseUrl: "http://localhost:11434", model: "llama3" },
    ),
    {},
  );
  assert.deepEqual(seedKeysFromConfig({ router: "a" }, null), { router: "a" });
});

test("the first load moves the model config key into the keyring", () => {
  const storage = createMockStorage();
  storage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify(routerConfig));

  assert.deepEqual(loadProviderKeys(storage), { router: "sk-or-saved" });
  assert.equal(
    storage.getItem(PROVIDER_KEYS_STORAGE_KEY),
    JSON.stringify({ router: "sk-or-saved" }),
  );
});

test("an existing keyring is not seeded again", () => {
  const storage = createMockStorage();
  storage.setItem(PROVIDER_KEYS_STORAGE_KEY, JSON.stringify({}));
  storage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify(routerConfig));

  assert.deepEqual(loadProviderKeys(storage), {});
});

test("each provider keeps its own key", () => {
  const storage = createMockStorage();
  saveProviderKey("router", "sk-or-1", storage);
  saveProviderKey("anthropic", "sk-ant-1", storage);

  assert.deepEqual(loadProviderKeys(storage), {
    router: "sk-or-1",
    anthropic: "sk-ant-1",
  });

  saveProviderKey("router", "  ", storage);
  assert.deepEqual(loadProviderKeys(storage), { anthropic: "sk-ant-1" });
});

test("clearing the keyring keeps it from being seeded again", () => {
  const storage = createMockStorage();
  storage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify(routerConfig));
  saveProviderKey("anthropic", "sk-ant-1", storage);

  clearProviderKeys(storage);
  assert.deepEqual(loadProviderKeys(storage), {});
});

test("a corrupt keyring loads as empty", () => {
  const storage = createMockStorage();
  storage.setItem(PROVIDER_KEYS_STORAGE_KEY, "{not json");
  assert.deepEqual(loadProviderKeys(storage), {});
});
