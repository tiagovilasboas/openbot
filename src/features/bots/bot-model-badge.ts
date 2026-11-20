import type { Language } from "../language/language.ts";
import { formatModelBadge } from "../model/model-config.ts";

/**
 * The header badge text: the bot's own model when it has one (with the
 * provider that serves it), else the label of the global model.
 */
export function botModelBadge(
  globalLabel: string,
  provider: string | undefined,
  modelId: string | undefined,
  language: Language,
): string {
  const own = modelId?.trim();
  if (!own) return globalLabel;
  return provider ? formatModelBadge({ provider, model: own }, language) : own;
}
