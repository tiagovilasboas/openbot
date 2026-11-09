import { createAnthropicAdapter } from "./anthropic-adapter.ts";
import { createLocalAdapter } from "./local-adapter.ts";
import { createRouterAdapter } from "./router-adapter.ts";
import type { ModelNetworkOptions } from "./guarded-model-fetch.ts";
import type { FetchLike, ModelAdapter } from "./model-adapter.ts";
import type { ClientModelConfig } from "./model-config.ts";

type Env = Record<string, string | undefined>;

function present(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Picks the adapter:
 * - If customConfig is provided by the client, creates the requested provider adapter.
 * - Otherwise falls back to server env configuration in priority order:
 *   1. Local direct endpoint (Ollama-compatible)
 *   2. Model router endpoint (OmniRoute / 9Router / OpenRouter OpenAI-compatible)
 *   3. Anthropic direct API
 * Returns null when nothing is configured.
 */
export function selectAdapter(
  env: Env,
  customConfig?: ClientModelConfig | null,
  fetchImpl?: FetchLike,
  network: ModelNetworkOptions = {},
): ModelAdapter | null {
  if (customConfig) {
    if (customConfig.provider === "local") {
      return createLocalAdapter({
        baseUrl: customConfig.baseUrl,
        model: customConfig.model,
        fetchImpl,
        guardUrl: true,
        ...network,
      });
    }
    if (customConfig.provider === "router") {
      return createRouterAdapter({
        baseUrl: customConfig.baseUrl,
        model: customConfig.model,
        apiKey: customConfig.apiKey,
        fetchImpl,
        guardUrl: true,
        ...network,
      });
    }
    if (customConfig.provider === "anthropic") {
      return createAnthropicAdapter({
        apiKey: customConfig.apiKey,
        model: customConfig.model,
        fetchImpl,
        ...network,
      });
    }
  }

  const localUrl = present(env.LOCAL_MODEL_URL);
  const localModel = present(env.LOCAL_MODEL_NAME);
  if (localUrl && localModel) {
    return createLocalAdapter({
      baseUrl: localUrl,
      model: localModel,
      fetchImpl,
      ...network,
    });
  }

  const routerUrl = present(env.ROUTER_URL);
  const routerModel = present(env.ROUTER_MODEL);
  if (routerUrl && routerModel) {
    const routerApiKey = present(env.ROUTER_API_KEY) ?? undefined;
    return createRouterAdapter({
      baseUrl: routerUrl,
      model: routerModel,
      apiKey: routerApiKey,
      fetchImpl,
      ...network,
    });
  }

  const apiKey = present(env.ANTHROPIC_API_KEY);
  const anthropicModel = present(env.ANTHROPIC_MODEL);
  if (apiKey && anthropicModel) {
    return createAnthropicAdapter({
      apiKey,
      model: anthropicModel,
      fetchImpl,
      ...network,
    });
  }

  return null;
}
