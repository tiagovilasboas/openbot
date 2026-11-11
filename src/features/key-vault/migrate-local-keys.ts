import {
  MODEL_CONFIG_STORAGE_KEY,
  validateClientModelConfig,
  withoutApiKey,
} from "../model/model-config.ts";
import {
  KEYED_PROVIDERS,
  PROVIDER_KEYS_STORAGE_KEY,
  sanitizeProviderKeys,
  type KeyedProvider,
  type ProviderKeys,
} from "../model/provider-keys.ts";
import {
  ANTHROPIC_ORIGIN,
  keyOriginFor,
  OPENROUTER_ORIGIN,
} from "./key-origin.ts";

// Moves keys an older version left in this browser into the server's vault.
// A key leaves the browser only after the server answered 200 for it.

export type MigrationStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;
export type PutKey = (input: {
  provider: KeyedProvider;
  origin: string;
  key: string;
}) => Promise<boolean>;

export type MigrationResult = { migrated: number; failed: number };

type Candidate = { provider: KeyedProvider; origin: string; key: string };

function readJson(storage: MigrationStorage, name: string): unknown {
  try {
    const raw = storage.getItem(name);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

// The key in the active config is the one that was in use, so it is the one
// kept (the vault holds one key per provider). Its origin is its own URL.
function configCandidate(config: unknown): Candidate | null {
  const valid = validateClientModelConfig(config);
  if (!valid || valid.provider === "local" || !valid.apiKey) return null;
  const origin = keyOriginFor(valid);
  return origin
    ? { provider: valid.provider, origin, key: valid.apiKey }
    : null;
}

// A keyring key is OpenRouter's, or Anthropic's: the Connections tab only
// offers those two.
function keyringCandidate(provider: KeyedProvider, key: string): Candidate {
  return {
    provider,
    origin: provider === "router" ? OPENROUTER_ORIGIN : ANTHROPIC_ORIGIN,
    key,
  };
}

function candidates(storage: MigrationStorage): Candidate[] {
  const config = readJson(storage, MODEL_CONFIG_STORAGE_KEY);
  const keyring = sanitizeProviderKeys(
    readJson(storage, PROVIDER_KEYS_STORAGE_KEY),
  );
  const found: Candidate[] = [];
  for (const provider of KEYED_PROVIDERS) {
    const fromConfig = configCandidate(config);
    const chosen =
      fromConfig?.provider === provider
        ? fromConfig
        : keyring[provider]
          ? keyringCandidate(provider, keyring[provider])
          : null;
    if (chosen) found.push(chosen);
  }
  return found;
}

function forget(storage: MigrationStorage, provider: KeyedProvider): void {
  const keyring: ProviderKeys = sanitizeProviderKeys(
    readJson(storage, PROVIDER_KEYS_STORAGE_KEY),
  );
  if (keyring[provider]) {
    delete keyring[provider];
    if (Object.keys(keyring).length === 0) {
      storage.removeItem(PROVIDER_KEYS_STORAGE_KEY);
    } else {
      storage.setItem(PROVIDER_KEYS_STORAGE_KEY, JSON.stringify(keyring));
    }
  }
  const config = validateClientModelConfig(
    readJson(storage, MODEL_CONFIG_STORAGE_KEY),
  );
  if (config && config.provider === provider) {
    storage.setItem(
      MODEL_CONFIG_STORAGE_KEY,
      JSON.stringify(withoutApiKey(config)),
    );
  }
}

/** Saves each old key to the vault, then removes it from the browser. */
export async function migrateLocalKeys(
  storage: MigrationStorage,
  putKey: PutKey,
): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: 0, failed: 0 };
  for (const candidate of candidates(storage)) {
    const saved = await putKey(candidate);
    if (!saved) {
      result.failed += 1;
      continue;
    }
    try {
      forget(storage, candidate.provider);
      result.migrated += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
