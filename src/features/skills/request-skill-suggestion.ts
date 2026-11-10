import { createCallSignal } from "../chat/call-timeout.ts";
import { browserIsOnline } from "../chat/request-model-reply.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import {
  classifyFetchError,
  classifyModelFailure,
  type ModelFailure,
} from "../model/classify-model-failure.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { withApiHeaders } from "../server-guard/api-request-init.ts";
import {
  parseSuggestionReply,
  type SkillDraft,
} from "./parse-suggestion-reply.ts";

export type SuggestionOutcome =
  | { kind: "draft"; draft: SkillDraft }
  | { kind: "not_enough_history" }
  | { kind: "invalid_suggestion" }
  /** The server has no model configured. */
  | { kind: "unavailable" }
  | { kind: "error"; failure: ModelFailure };

export interface SuggestionOptions {
  config?: ClientModelConfig | null;
  /** The bot's own model; empty means the global model setting. */
  modelId?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  isOnline?: () => boolean;
}

/**
 * Asks POST /api/skills/suggest for one skill draft from the user's messages.
 * The draft is read back through the same parser the server used: the front
 * never trusts the shape of what comes over the wire.
 */
export async function requestSkillSuggestion(
  language: ChatLanguage,
  messages: readonly string[],
  fetchImpl: typeof fetch = fetch,
  options: SuggestionOptions = {},
): Promise<SuggestionOutcome> {
  const call = createCallSignal(options.signal, options.timeoutMs);
  const failureOfThrow = (): SuggestionOutcome => ({
    kind: "error",
    failure: classifyFetchError({
      cancelled: call.cancelled(),
      timedOut: call.timedOut(),
      online: (options.isOnline ?? browserIsOnline)(),
    }),
  });
  try {
    let response: Response;
    try {
      response = await fetchImpl(
        "/api/skills/suggest",
        withApiHeaders({
          method: "POST",
          signal: call.signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            language,
            messages,
            ...(options.config ? { config: options.config } : {}),
            ...(options.modelId ? { modelId: options.modelId } : {}),
          }),
        }),
      );
    } catch {
      return failureOfThrow();
    }
    const payload: unknown = await response.json().catch(() => null);
    if (call.signal.aborted) return failureOfThrow();
    return outcomeOf(response, payload);
  } finally {
    call.dispose();
  }
}

function outcomeOf(response: Response, payload: unknown): SuggestionOutcome {
  const body = (payload ?? {}) as {
    error?: unknown;
    detail?: unknown;
    skill?: unknown;
  };
  if (response.ok) {
    const draft = parseSuggestionReply(JSON.stringify(body.skill ?? null));
    return draft ? { kind: "draft", draft } : { kind: "invalid_suggestion" };
  }
  if (body.error === "not_enough_history")
    return { kind: "not_enough_history" };
  if (body.error === "invalid_suggestion")
    return { kind: "invalid_suggestion" };
  if (response.status === 503 && body.error === "no_provider_configured") {
    return { kind: "unavailable" };
  }
  return {
    kind: "error",
    failure: classifyModelFailure(body.error, body.detail, response.status),
  };
}
