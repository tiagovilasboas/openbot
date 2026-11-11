import type { ModelFailure } from "../model/classify-model-failure.ts";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

/** The same sentence without the markdown emphasis, for plain-text surfaces. */
export function describeModelFailurePlain(
  failure: ModelFailure,
  language: ChatLanguage,
): string {
  return describeModelFailure(failure, language).replaceAll("**", "");
}

/** The chat reply for a failed model call: what went wrong and what to do. */
export function describeModelFailure(
  failure: ModelFailure,
  language: ChatLanguage,
): string {
  const content = chatCopy[language];
  switch (failure.kind) {
    case "auth":
      return content.modelErrorAuth;
    case "access_required":
      return content.modelErrorAccessRequired;
    case "rate_limit":
      return content.modelErrorRateLimit;
    case "model_unavailable":
      return content.modelErrorModel;
    case "blocked_url":
      return content.modelErrorBlockedUrl;
    case "offline":
      return content.modelErrorOffline;
    case "timeout":
      return content.modelErrorTimeout;
    case "response_too_long":
      return content.modelErrorTooLong;
    case "cancelled":
      return content.cancelledNote;
    case "unreachable":
      return content.modelErrorUnreachable;
    case "server":
      return failure.status
        ? `${content.modelErrorServer} (HTTP ${failure.status})`
        : content.modelErrorServer;
    default:
      return failure.status
        ? `${content.modelError} (HTTP ${failure.status})`
        : content.modelError;
  }
}
