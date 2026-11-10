import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { classifyModelFailure } from "../model/classify-model-failure.ts";
import type { ConnectionId } from "./connection-catalog.ts";
import { getConnectionsCopy } from "./connections-copy.ts";

/**
 * The short reason a key check failed, as a sentence. Services answer with
 * internal codes (provider_rejected, network_error); none of them reach people.
 */
export function describeKeyFailure(
  id: ConnectionId,
  outcome: { error: string; detail?: string },
  language: ChatLanguage,
): string {
  const c = getConnectionsCopy(language);
  if (id === "github") {
    if (outcome.error === "unauthorized") return c.unauthorized;
    if (outcome.error === "rate_limited") return c.rateLimited;
    if (outcome.error === "network_error") return c.network;
    return c.unknown;
  }
  switch (classifyModelFailure(outcome.error, outcome.detail).kind) {
    case "auth":
      return c.unauthorized;
    case "rate_limit":
      return c.rateLimited;
    case "unreachable":
    case "offline":
      return c.network;
    case "blocked_url":
      return c.blockedUrl;
    case "model_unavailable":
      return c.modelGone;
    case "server":
      return c.serverDown;
    default:
      return c.unknown;
  }
}
