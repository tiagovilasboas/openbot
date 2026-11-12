import type { FreeModelItem } from "./free-model-catalog.ts";
import type { ClientModelConfig } from "./model-config.ts";

export type ToolCapability = "native" | "none";

/**
 * Whether the configured model takes native tool calls. Router trusts the
 * catalog's `supportsTools` flag (unknown is "none"); local is opt-in later;
 * anthropic is not wired in v1.
 */
export function toolCapability(
  config: ClientModelConfig | undefined,
  catalogEntry?: Pick<FreeModelItem, "supportsTools">,
): ToolCapability {
  if (config?.provider === "router" && catalogEntry?.supportsTools === true) {
    return "native";
  }
  return "none";
}
