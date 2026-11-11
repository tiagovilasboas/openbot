import { isLanguage, type Language } from "../language/language.ts";
import {
  validateClientModelConfig,
  type ClientModelConfig,
} from "../model/model-config.ts";
import { parseModelId } from "../model/model-id.ts";
import { clipHistory, SUGGEST_MIN_MESSAGES } from "./suggestion-history.ts";

export interface SuggestionRequest {
  language: Language;
  /** The user's messages, already clipped and capped. */
  messages: string[];
  config?: ClientModelConfig;
  modelId?: string;
}

export type ParsedSuggestionRequest =
  | { ok: true; request: SuggestionRequest }
  | { ok: false; error: "invalid_request" | "not_enough_history" };

/**
 * Validates the body of POST /api/skills/suggest. The history is clipped
 * again here whatever the client did; too little of it is a typed refusal,
 * not a model call that would invent a skill from nothing.
 */
export function parseSuggestionRequest(
  payload: unknown,
): ParsedSuggestionRequest {
  const invalid = { ok: false, error: "invalid_request" } as const;
  if (typeof payload !== "object" || payload === null) return invalid;
  const { language, messages, config, modelId } = payload as Record<
    string,
    unknown
  >;
  if (!isLanguage(language)) return invalid;
  if (!Array.isArray(messages)) return invalid;

  let validatedConfig: ClientModelConfig | undefined;
  if (config !== undefined) {
    const parsed = validateClientModelConfig(config);
    if (!parsed) return invalid;
    validatedConfig = parsed;
  }
  const parsedModelId = parseModelId(modelId);
  if (!parsedModelId.ok) return invalid;

  const history = clipHistory(messages);
  if (history.length < SUGGEST_MIN_MESSAGES) {
    return { ok: false, error: "not_enough_history" };
  }

  return {
    ok: true,
    request: {
      language,
      messages: history,
      ...(validatedConfig ? { config: validatedConfig } : {}),
      ...(parsedModelId.modelId ? { modelId: parsedModelId.modelId } : {}),
    },
  };
}
