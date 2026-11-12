import { listPublicFreeModels } from "../../model/list-free-models.ts";
import type { ClientModelConfig } from "../../model/model-config.ts";
import {
  toolCapability,
  type ToolCapability,
} from "../../model/tool-capability.ts";

export type CapabilityLookup = (
  config: ClientModelConfig | undefined,
  modelId: string | undefined,
) => Promise<ToolCapability>;

/**
 * Whether the model of this request takes native tool calls, from the free
 * catalog (cached for five minutes by listPublicFreeModels). Only router
 * models can say yes, so other providers never trigger a catalog fetch.
 */
export const catalogCapability: CapabilityLookup = async (config, modelId) => {
  if (config?.provider !== "router") return toolCapability(config);
  const id = modelId ?? config.model;
  const { models } = await listPublicFreeModels();
  return toolCapability(
    config,
    models.find((model) => model.id === id),
  );
};
