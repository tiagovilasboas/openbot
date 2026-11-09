import type { ModelFailure } from "../model/classify-model-failure.ts";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

/** The chat reply for a failed model call: what went wrong and what to do. */
export function describeModelFailure(
  failure: ModelFailure,
  language: ChatLanguage,
): string {
  const content = chatCopy[language];
  switch (failure.kind) {
    case "auth":
      return content.modelErrorAuth;
    case "rate_limit":
      return content.modelErrorRateLimit;
    case "model_unavailable":
      return content.modelErrorModel;
    default:
      return failure.status
        ? `${content.modelError} (HTTP ${failure.status})`
        : content.modelError;
  }
}
