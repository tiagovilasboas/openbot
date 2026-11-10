import type { MessageData } from "./ChatMessageItem.tsx";
import type { ChatReplyOutcome } from "./execute-chat-message.ts";
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
  ): MessageData => ({
    id: nextId(),
    role: "assistant",
    language,
    text,
    delegatedBot,
    modelBadge,
  });

  // Called last so the synthesis id sorts after the specialists.
  const finalMessage = (): MessageData => ({
    ...message(reply.text),
    ...(reply.github ? { github: reply.github } : {}),
    ...(reply.failover ? { failover: reply.failover } : {}),
    ...(reply.incomplete ? { incomplete: reply.incomplete } : {}),
  });
  if (!reply.crew) return [finalMessage()];

  const kickoff = message(reply.crew.kickoff);
  const specialists = reply.crew.specialists.map(({ bot, text }) =>
    message(text, bot),
  );
  return [kickoff, ...specialists, finalMessage()];
}
