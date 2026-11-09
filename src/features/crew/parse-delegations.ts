import type { BotProfile } from "../bots/bot-types.ts";

export interface Delegation {
  bot: BotProfile;
  task: string;
}

export interface ParsedChiefReply {
  /** Valid delegations, in order, one per bot. */
  delegations: Delegation[];
  /** The reply without any delegation line, ready to show the user. */
  visibleText: string;
}

// Free models dress lines up as lists, bold or code; strip that first.
const DECORATION = /^[\s>*_`•\-–\d.)]*|[\s*_`]*$/g;
const DELEGATION_LINE = /^@(?:delegate|delegar)\b\s*@?([^:]+?)\s*:\s*(.*)$/i;

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[\s\-_*`@]+/g, "");
}

function findBot(target: string, bots: BotProfile[]): BotProfile | undefined {
  const wanted = normalizeName(target);
  return bots.find(
    (bot) =>
      normalizeName(bot.name) === wanted || normalizeName(bot.id) === wanted,
  );
}

/**
 * Reads the Chief's reply for `@delegate <Bot>: <task>` lines. Unknown bots,
 * the Chief itself, empty tasks and repeated bots are dropped; every
 * delegation-shaped line leaves the visible text either way.
 */
export function parseDelegations(
  reply: string,
  bots: BotProfile[],
  chiefId: string,
): ParsedChiefReply {
  const delegations: Delegation[] = [];
  const visible: string[] = [];

  for (const line of reply.split("\n")) {
    const match = line.replace(DECORATION, "").match(DELEGATION_LINE);
    if (!match) {
      visible.push(line);
      continue;
    }
    const bot = findBot(match[1] ?? "", bots);
    const task = (match[2] ?? "").replace(/^[\s*_`]+/, "").trim();
    const isNew = bot && !delegations.some((d) => d.bot.id === bot.id);
    if (bot && bot.id !== chiefId && task && isNew) {
      delegations.push({ bot, task });
    }
  }

  return { delegations, visibleText: visible.join("\n").trim() };
}
