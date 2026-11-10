/**
 * Why a model call failed, in terms a person can act on. Adapters report
 * upstream errors as a detail like "401: No auth credentials found" or
 * "HTTP 429". The status decides the kind; the upstream text is never shown.
 */
export type ModelFailureKind =
  | "auth"
  | "rate_limit"
  | "model_unavailable"
  | "blocked_url"
  | "unreachable"
  | "offline"
  | "timeout"
  | "cancelled"
  | "server"
  | "unknown";

export interface ModelFailure {
  kind: ModelFailureKind;
  /** Upstream HTTP status, when the provider answered. */
  status?: number;
}

function statusOf(detail: string | undefined): number | undefined {
  const match = detail?.match(/^(?:HTTP )?(\d{3})\b/);
  return match ? Number(match[1]) : undefined;
}

/** What a thrown fetch means: the user cancelled, time ran out, or no network. */
export function classifyFetchError(state: {
  cancelled: boolean;
  timedOut: boolean;
  online: boolean;
}): ModelFailure {
  if (state.cancelled) return { kind: "cancelled" };
  if (state.timedOut) return { kind: "timeout" };
  return { kind: state.online ? "unreachable" : "offline" };
}

export function classifyModelFailure(
  code: unknown,
  detail: unknown,
  httpStatus?: number,
): ModelFailure {
  if (code === "blocked_base_url") return { kind: "blocked_url" };
  // The server's allow-list refused this bot's model id.
  if (code === "model_not_allowed") {
    return { kind: "model_unavailable", status: 400 };
  }
  if (code === "provider_unreachable" || code === "network_error") {
    return { kind: "unreachable" };
  }
  const text = typeof detail === "string" ? detail : undefined;
  const status = statusOf(text);
  if (status === 401 || status === 403) return { kind: "auth", status };
  if (status === 429) return { kind: "rate_limit", status };
  // OpenRouter answers 404 "No endpoints found" or 400 "not a valid model ID".
  if (status === 404 || (status === 400 && /model/i.test(text ?? ""))) {
    return { kind: "model_unavailable", status };
  }
  if (status && status >= 500) return { kind: "server", status };
  if (status) return { kind: "unknown", status };
  if (httpStatus && httpStatus >= 500) {
    return { kind: "server", status: httpStatus };
  }
  return { kind: "unknown" };
}
