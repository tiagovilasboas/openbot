import { createAnthropicAdapter } from "./anthropic-adapter.ts";
import { createLocalAdapter } from "./local-adapter.ts";
import type { ModelAdapter } from "./model-adapter.ts";

type Env = Record<string, string | undefined>;

function present(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Picks the provider explicitly configured on the server. Local wins over
 * cloud so data never leaves the machine unless only the cloud is configured.
 * Returns null when nothing is configured; there is no silent default.
 */
export function selectAdapter(env: Env): ModelAdapter | null {
  const localUrl = present(env.LOCAL_MODEL_URL);
  const localModel = present(env.LOCAL_MODEL_NAME);
  if (localUrl && localModel) {
    return createLocalAdapter({ baseUrl: localUrl, model: localModel });
  }

  const apiKey = present(env.ANTHROPIC_API_KEY);
  const anthropicModel = present(env.ANTHROPIC_MODEL);
  if (apiKey && anthropicModel) {
    return createAnthropicAdapter({ apiKey, model: anthropicModel });
  }

  return null;
}
