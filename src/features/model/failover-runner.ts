import { createRouterAdapter } from "./router-adapter.ts";
import { selectAdapter } from "./select-adapter.ts";
import type {
  FetchLike,
  ModelAdapter,
  ModelRequest,
  ModelResult,
} from "./model-adapter.ts";

export interface FailoverRunnerOptions {
  request: ModelRequest;
  primaryAdapter: ModelAdapter;
  fallbackAdapter?: ModelAdapter | null;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
}

const DEFAULT_ROUTER_FALLBACKS: Record<string, string> = {
  "openrouter/free": "nvidia/nemotron-3.5-super-vl:free",
  "nvidia/nemotron-3.5-super-vl:free": "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free": "nvidia/nemotron-3.5-super-vl:free",
  "google/gemma-4-31b-it:free": "openrouter/free",
};

function resolveAutoFallbackAdapter(
  primaryAdapter: ModelAdapter,
  request: ModelRequest,
  env: Record<string, string | undefined> = {},
  fetchImpl?: FetchLike,
): ModelAdapter | null {
  if (request.fallbackConfig) {
    const custom = selectAdapter(env, request.fallbackConfig, fetchImpl);
    if (custom) return custom;
  }

  // If primary is router, pick an automatic alternative router model
  const currentModel = request.modelId ?? primaryAdapter.model;
  if (primaryAdapter.provider === "router" && currentModel) {
    const targetModel =
      DEFAULT_ROUTER_FALLBACKS[currentModel] ?? "openrouter/free";

    if (targetModel !== currentModel) {
      const routerConfig =
        request.config?.provider === "router" ? request.config : null;
      const baseUrl =
        routerConfig?.baseUrl ??
        env.ROUTER_URL ??
        "https://openrouter.ai/api/v1";
      const apiKey = routerConfig?.apiKey ?? env.ROUTER_API_KEY;
      return createRouterAdapter({
        baseUrl,
        model: targetModel,
        apiKey,
        fetchImpl,
        // A client-supplied base URL must pass the guard on the fallback too.
        guardUrl: routerConfig !== null,
      });
    }
  }

  return null;
}

export async function executeWithFailover({
  request,
  primaryAdapter,
  fallbackAdapter,
  env = {},
  fetchImpl,
}: FailoverRunnerOptions): Promise<ModelResult> {
  const primaryResult = await primaryAdapter.generateReply(request);
  if (primaryResult.ok || primaryResult.code === "blocked_base_url") {
    return primaryResult;
  }

  const secondaryAdapter =
    fallbackAdapter ??
    resolveAutoFallbackAdapter(primaryAdapter, request, env, fetchImpl);

  if (!secondaryAdapter) {
    return primaryResult;
  }

  // The per-call model just failed: the fallback uses its own model.
  const { modelId, ...fallbackRequest } = request;
  const fallbackResult = await secondaryAdapter.generateReply(fallbackRequest);
  if (fallbackResult.ok) {
    return {
      ok: true,
      provider: fallbackResult.provider,
      text: fallbackResult.text,
      failover: {
        fromModel: modelId ?? primaryAdapter.model ?? primaryAdapter.provider,
        toModel: secondaryAdapter.model ?? secondaryAdapter.provider,
        reason: primaryResult.detail ?? primaryResult.code,
      },
    };
  }

  return {
    ok: false,
    code: fallbackResult.code,
    provider: fallbackResult.provider,
    detail: fallbackResult.detail ?? primaryResult.detail,
  };
}
