import type { BotProfile } from "../bots/bot-types.ts";
import { DELEGATE_KEYWORD } from "./crew-copy.ts";
import { findBot } from "./parse-delegations.ts";

const MENTION = /(?:^|[\s(,;])@([\p{L}\p{N}_-]+)/gu;

export interface MentionRoute {
  bot: BotProfile;
  task: string;
}

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

/**
 * The specialists the user named with `@name`, in mention order. Unknown or
 * hidden names, the Chief itself and repeats are ignored. The task each gets
 * is the user's message without the valid mentions, on one line.
 */
export function routeByMentions(
  userText: string,
  bots: BotProfile[],
  chiefId: string,
): MentionRoute[] {
  const named: BotProfile[] = [];
  const stripped = userText.replace(MENTION, (whole, name: string) => {
    const bot = findBot(name, bots);
    if (!bot || bot.id === chiefId) return whole;
    if (!named.some((n) => n.id === bot.id)) named.push(bot);
    return whole.replace(`@${name}`, "");
  });
  const task = oneLine(stripped) || oneLine(userText);
  return named.map((bot) => ({ bot, task }));
}

/**
 * A Chief reply made of delegation lines, so the normal crew turn runs the
 * named bots without asking the Chief's model. Null when nobody is named.
 */
export function mentionDelegationReply(
  userText: string,
  bots: BotProfile[],
  chiefId: string,
): string | null {
  const routes = routeByMentions(userText, bots, chiefId);
  if (routes.length === 0) return null;
  return routes
    .map(({ bot, task }) => `${DELEGATE_KEYWORD} ${bot.name}: ${task}`)
    .join("\n");
}
