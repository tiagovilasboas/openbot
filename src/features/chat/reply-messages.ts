import type { CrewStepRecord } from "../crew/crew-step-record.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import type { ChatReplyOutcome } from "./chat-reply-outcome.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

/**
 * Turns one reply into the thread's assistant messages. A delegated turn
 * shows the Chief's kickoff, each specialist under its own name, then the
 * Chief's synthesis; any other turn is a single message.
 */
export function buildReplyMessages(
  reply: ChatReplyOutcome,
  {
    language,
    modelBadge,
    nextId,
  }: { language: ChatLanguage; modelBadge?: string; nextId: () => number },
): MessageData[] {
  const message = (
    text: string,
    delegatedBot = reply.delegatedBot,
    crewStep?: CrewStepRecord,
  ): MessageData => ({
    id: nextId(),
    role: "assistant",
    language,
    text,
    delegatedBot,
    modelBadge,
    ...(crewStep ? { crewStep } : {}),
    ...(crewStep?.incomplete ? { incomplete: crewStep.incomplete } : {}),
  });

  // Called last so the synthesis id sorts after the specialists.
  const finalMessage = (): MessageData => ({
    ...message(reply.text),
    ...(reply.github ? { github: reply.github } : {}),
    ...(reply.failover ? { failover: reply.failover } : {}),
    ...(reply.incomplete ? { incomplete: reply.incomplete } : {}),
    ...(reply.toolSteps?.length ? { toolSteps: reply.toolSteps } : {}),
  });
  if (!reply.crew) return [finalMessage()];

  const kickoff = message(reply.crew.kickoff);
  const specialists = reply.crew.specialists.map(({ bot, text, step }) =>
    message(text, bot, step),
  );
  return [kickoff, ...specialists, finalMessage()];
}
