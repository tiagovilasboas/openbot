import type { BotProfile } from "../bots/bot-types.ts";
import { parseDelegations } from "./parse-delegations.ts";

// A line that is, or may still turn into, an `@delegate` line.
const MAY_BE_DELEGATION = /^[\s>*_`•\-–\d.)]*@/;

/**
 * What to show of the Chief's reply while it streams. Delegation lines never
 * show, and the line still being written is held back while it starts with
 * "@", so "@dele" never flashes before it is known to be a delegation.
 */
export function liveChiefText(
  text: string,
  bots: BotProfile[],
  chiefId: string,
): string {
  const lineStart = text.lastIndexOf("\n") + 1;
  const open = text.slice(lineStart);
  const shown = MAY_BE_DELEGATION.test(open) ? text.slice(0, lineStart) : text;
  return parseDelegations(shown, bots, chiefId).visibleText;
}
