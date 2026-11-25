import type { FreeModelItem } from "../../model/free-model-catalog.ts";
import { listPublicFreeModels } from "../../model/list-free-models.ts";
import type { ClientModelConfig } from "../../model/model-config.ts";
import {
  toolCapability,
  type ToolCapability,
} from "../../model/tool-capability.ts";

type Env = Record<string, string | undefined>;
type ListModels = () => Promise<{ models: readonly FreeModelItem[] }>;

export type CapabilityLookup = (
  config: ClientModelConfig | undefined,
  modelId: string | undefined,
  env: Env,
) => Promise<ToolCapability>;

function present(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function listed(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * The provider the server env would pick when the client sends no config,
 * in selectAdapter's order: a local endpoint wins over the router, so only a
 * router-only env counts as a router turn.
 */
function envRouterConfig(env: Env): ClientModelConfig | undefined {
  if (present(env.LOCAL_MODEL_URL) && present(env.LOCAL_MODEL_NAME)) {
    return undefined;
  }
  const baseUrl = present(env.ROUTER_URL);
  const model = present(env.ROUTER_MODEL);
  return baseUrl && model ? { provider: "router", baseUrl, model } : undefined;
}

/**
 * Whether the model of this request takes native tool calls, from the free
 * catalog. Only router models can say yes, so other providers never trigger
 * a catalog fetch. With no client config the server env decides the model.
 */
export function createCatalogCapability(
  listModels: ListModels,
): CapabilityLookup {
  return async (clientConfig, modelId, env) => {
    const config = clientConfig ?? envRouterConfig(env);
    if (config?.provider !== "router") return toolCapability(config);
    const id = modelId ?? config.model;
    // The operator may vouch for models the public catalog does not list
    // (a self-hosted router, the e2e stub); no catalog fetch then.
    if (listed(env.OPENBOT_TOOLS_NATIVE_MODELS).includes(id)) return "native";
    const { models } = await listModels();
    return toolCapability(
      config,
      models.find((model) => model.id === id),
    );
  };
}

/** Backed by listPublicFreeModels, which caches the catalog for five minutes. */
export const catalogCapability = createCatalogCapability(listPublicFreeModels);
