import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ModelFailure } from "@/features/model/classify-model-failure.ts";
import type { ChatReplyOutcome } from "./chat-reply-outcome.ts";
import { describeModelFailure } from "./describe-model-failure.ts";
import { replyFailureOf } from "./reply-failure.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

const failureField = (failure: ModelFailure) => {
  const kind = replyFailureOf(failure);
  return kind ? { failure: kind } : {};
};

/** The reply that tells the user why the model call failed. */
export const failedReply = (
  failure: ModelFailure,
  language: ChatLanguage,
  delegatedBot: BotProfile | undefined,
): ChatReplyOutcome => ({
  text: describeModelFailure(failure, language),
  delegatedBot,
  // A cancel is the user's choice, not the model failing: no failed status.
  ...(failure.kind === "cancelled" ? {} : { modelCall: "failed" as const }),
  ...failureField(failure),
});
