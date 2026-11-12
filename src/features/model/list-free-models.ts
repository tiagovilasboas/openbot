import {
  KNOWN_FREE_MODELS,
  pickFreeTextModels,
  type FreeModelItem,
} from "./free-model-catalog.ts";

/** Server-only: fetches the free model list, public or for one account. */

export type FreeModelSource = "live" | "cache" | "fallback" | "account";

export interface FreeModelList {
  ok: true;
  source: FreeModelSource;
  models: FreeModelItem[];
}

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const OPENROUTER_ACCOUNT_MODELS_URL =
  "https://openrouter.ai/api/v1/models/user";
const OPENROUTER_KEY_URL = "https://openrouter.ai/api/v1/key";
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedPublic: FreeModelItem[] | null = null;
let cachedAt = 0;

async function fetchCatalog(
  url: string,
  headers: Record<string, string>,
  fetchImpl: typeof fetch,
  byPriceToo: boolean,
): Promise<FreeModelItem[] | null> {
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "OpenBot",
        ...headers,
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return pickFreeTextModels(await response.json(), { byPriceToo });
  } catch {
    return null;
  }
}

/** The public free list, cached for five minutes, with a built-in fallback. */
export async function listPublicFreeModels(
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<FreeModelList> {
  if (cachedPublic && now - cachedAt < CACHE_TTL_MS) {
    return { ok: true, source: "cache", models: cachedPublic };
  }
  const models = await fetchCatalog(
    OPENROUTER_MODELS_URL,
    {},
    fetchImpl,
    false,
  );
  if (!models) {
    return {
      ok: true,
      source: "fallback",
      models: cachedPublic ?? [...KNOWN_FREE_MODELS],
    };
  }
  cachedPublic = models;
  cachedAt = now;
  return { ok: true, source: "live", models };
}

/**
 * The free models this key can use, as OpenRouter filters them for the
 * account's privacy and provider settings. Never cached: the list is per key.
 * The models endpoint answers an unknown key with the public catalog, so the
 * key is confirmed first. Falls back to the public list on any failure.
 */
export async function listAccountFreeModels(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FreeModelList> {
  const auth = { Authorization: `Bearer ${apiKey}` };
  const [isKnownKey, models] = await Promise.all([
    fetchImpl(OPENROUTER_KEY_URL, { headers: auth, cache: "no-store" }).then(
      (response) => response.ok,
      () => false,
    ),
    fetchCatalog(OPENROUTER_ACCOUNT_MODELS_URL, auth, fetchImpl, true),
  ]);
  if (isKnownKey && models) return { ok: true, source: "account", models };
  return listPublicFreeModels(fetchImpl);
}
