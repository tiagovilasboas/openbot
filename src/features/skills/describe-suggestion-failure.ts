import { describeModelFailurePlain } from "../chat/describe-model-failure.ts";
import {
  getUnconfiguredModelMessage,
  type ChatLanguage,
} from "../chat/respond-to-message.ts";
import { fillCopy } from "../model/settings-copy.ts";
import type { SuggestionOutcome } from "./request-skill-suggestion.ts";
import { SUGGEST_MIN_MESSAGES } from "./suggestion-history.ts";
import { getSuggestionCopy } from "./suggestion-copy.ts";

/**
 * What a suggestion that gave no draft says to the person. Model failures
 * reuse the chat's typed copy, so a timeout or a bad key reads the same here.
 */
export function describeSuggestionFailure(
  outcome: Exclude<SuggestionOutcome, { kind: "draft" }>,
  language: ChatLanguage,
): string {
  const copy = getSuggestionCopy(language);
  switch (outcome.kind) {
    case "not_enough_history":
      return fillCopy(copy.notEnoughHistory, {
        min: String(SUGGEST_MIN_MESSAGES),
      });
    case "invalid_suggestion":
      return copy.invalidSuggestion;
    case "unavailable":
      return getUnconfiguredModelMessage(language);
    case "error":
      return describeModelFailurePlain(outcome.failure, language);
  }
}
