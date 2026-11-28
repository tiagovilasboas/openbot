import {
  ANTHROPIC_DEFAULT_MODEL,
  CHATGPT_DEFAULT_MODEL,
  OPENROUTER_FREE_MODEL,
  OPENROUTER_URL,
} from "../connections/copy.ts";
import {
  validateClientModelConfig,
  type ClientModelConfig,
  type ModelProviderType,
} from "./model-config.ts";

/** What the Model settings form starts on when nothing is saved: the same
 * models a fresh connection selects, so saving untouched fields works. */
export const SETTINGS_FORM_DEFAULTS = {
  routerUrl: OPENROUTER_URL,
  routerModel: OPENROUTER_FREE_MODEL,
  anthropicModel: ANTHROPIC_DEFAULT_MODEL,
  chatgptModel: CHATGPT_DEFAULT_MODEL,
} as const;

export function buildCandidateModelConfig(fields: {
  provider: ModelProviderType;
  routerUrl: string;
  routerModel: string;
  localUrl: string;
  localModel: string;
  anthropicModel: string;
  chatgptModel: string;
}): ClientModelConfig | null {
  switch (fields.provider) {
    case "router":
      return validateClientModelConfig({
        provider: "router",
        baseUrl: fields.routerUrl,
        model: fields.routerModel,
      });
    case "local":
      return validateClientModelConfig({
        provider: "local",
        baseUrl: fields.localUrl,
        model: fields.localModel,
      });
    case "anthropic":
      return validateClientModelConfig({
        provider: "anthropic",
        model: fields.anthropicModel,
      });
    case "chatgpt":
      return validateClientModelConfig({
        provider: "chatgpt",
        model: fields.chatgptModel,
      });
  }
}
