import assert from "node:assert/strict";
import test from "node:test";
import { pickFreeTextModels } from "./free-model-catalog.ts";
import { listAccountFreeModels } from "./list-free-models.ts";

const catalog = {
  data: [
    { id: "google/gemma-4-31b-it:free", name: "Gemma", context_length: 1000 },
    {
      id: "stealth/crouton-alpha",
      name: "Crouton",
      pricing: { prompt: "0", completion: "0" },
      architecture: { output_modalities: ["text"] },
    },
    {
      id: "google/lyria-3:free",
      architecture: { output_modalities: ["audio"] },
    },
    {
      id: "google/lyria-3-pro-preview",
      pricing: { prompt: "0", completion: "0" },
      architecture: { output_modalities: ["text", "audio"] },
    },
    { id: "openai/gpt-6", pricing: { prompt: "0.000002", completion: "0" } },
    { id: "openrouter/free" },
    { id: 42 },
  ],
};

test("the public list keeps :free text models, auto router first", () => {
  const ids = pickFreeTextModels(catalog)?.map((model) => model.id);
  assert.deepEqual(ids, ["openrouter/free", "google/gemma-4-31b-it:free"]);
});

test("the account list also keeps zero-priced models", () => {
  const ids = pickFreeTextModels(catalog, { byPriceToo: true })?.map(
    (model) => model.id,
  );
  assert.deepEqual(ids, [
    "openrouter/free",
    "google/gemma-4-31b-it:free",
    "stealth/crouton-alpha",
  ]);
});

test("an unknown payload is not a list", () => {
  assert.equal(pickFreeTextModels({ models: [] }), null);
  assert.equal(pickFreeTextModels(null), null);
});

test("the account list sends the key to OpenRouter only", async () => {
  const calls: Array<{ url: string; auth?: string }> = [];
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url, auth: headers.Authorization });
    return new Response(JSON.stringify(catalog), { status: 200 });
  }) as typeof fetch;

  const list = await listAccountFreeModels("sk-or-test", fakeFetch);
  assert.equal(list.source, "account");
  assert.deepEqual(calls.map((call) => call.url).sort(), [
    "https://openrouter.ai/api/v1/key",
    "https://openrouter.ai/api/v1/models/user",
  ]);
  assert.ok(calls.every((call) => call.auth === "Bearer sk-or-test"));
});

test("an unknown key falls back to the public list", async () => {
  const fakeFetch = (async (url: string) =>
    url.endsWith("/key")
      ? new Response("{}", { status: 401 })
      : new Response(JSON.stringify(catalog), { status: 200 })) as typeof fetch;

  const list = await listAccountFreeModels("sk-or-bad", fakeFetch);
  assert.notEqual(list.source, "account");
  assert.equal(list.models[0]?.id, "openrouter/free");
});
