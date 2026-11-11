import type { ModelFailure } from "../model/classify-model-failure.ts";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

/**
 * Why a reply is only partly there. "error": the stream broke, so a retry can
 * help. "too_long": the reply hit the size cap, so the same request would hit
 * it again and no retry is offered. "cancelled": the user stopped it.
 */
export type IncompleteKind = "error" | "cancelled" | "too_long";

export function incompleteKindOf(failure: ModelFailure): IncompleteKind {
  if (failure.kind === "cancelled") return "cancelled";
  if (failure.kind === "response_too_long") return "too_long";
  return "error";
}

/** Only an interrupted reply can be retried to a better result. */
export function canRetryIncomplete(kind: IncompleteKind): boolean {
  return kind === "error";
}

export function incompleteNote(
  kind: IncompleteKind,
  content: (typeof chatCopy)[ChatLanguage],
): string {
  if (kind === "cancelled") return content.cancelledNote;
  if (kind === "too_long") return content.truncatedNote;
  return content.interruptedNote;
}
