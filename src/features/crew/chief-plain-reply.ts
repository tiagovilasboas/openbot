import type { BotProfile } from "../bots/bot-types.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { crewCopy } from "./crew-copy.ts";
import { parseDelegations } from "./parse-delegations.ts";

/**
 * What the user sees when the Chief's reply led to no delegation. Delegation
 * lines never show: they are stripped, and when nothing else is left the
 * Chief says it could not find that bot.
 */
export function chiefPlainReply(
  reply: string,
  bots: BotProfile[],
  chiefId: string,
  language: ChatLanguage,
): string {
  const { visibleText } = parseDelegations(reply, bots, chiefId);
  if (visibleText) return visibleText;
  return reply.trim() ? crewCopy[language].delegateNotFound : reply;
}
