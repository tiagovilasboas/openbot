import type {
  ModelFailure,
  ModelFailureKind,
} from "../model/classify-model-failure.ts";

/**
 * Why a reply is an error message instead of an answer. Stored on the reply
 * so its action (Settings or Try again) survives a reload. Optional on every
 * message: threads saved before this field existed stay valid.
 */
export type ReplyFailure =
  Exclude<ModelFailureKind, "cancelled"> | "unconfigured";

export type ReplyFailureAction = "settings" | "retry" | "none";

const KINDS: ReadonlySet<string> = new Set<ReplyFailure>([
  "auth",
  "access_required",
  "rate_limit",
  "model_unavailable",
  "blocked_url",
  "unreachable",
  "offline",
  "timeout",
  "server",
  "response_too_long",
  "provider_off",
  "unknown",
  "unconfigured",
]);

/** The failure a reply stores; none for a cancel, which the user chose. */
export function replyFailureOf(
  failure: ModelFailure,
): ReplyFailure | undefined {
  return failure.kind === "cancelled" ? undefined : failure.kind;
}

/** An untrusted stored or imported value as a failure; undefined if unknown. */
export function readReplyFailure(value: unknown): ReplyFailure | undefined {
  return typeof value === "string" && KINDS.has(value)
    ? (value as ReplyFailure)
    : undefined;
}

/**
 * What the user can do about it. A setup problem is fixed in Settings; a
 * reply that was too long would be too long again, so it offers nothing; every
 * other failure may pass on a second try.
 */
export function replyFailureAction(failure: ReplyFailure): ReplyFailureAction {
  switch (failure) {
    case "auth":
    case "access_required":
    case "model_unavailable":
    case "blocked_url":
    case "provider_off":
    case "unconfigured":
      return "settings";
    case "response_too_long":
      return "none";
    default:
      return "retry";
  }
}
