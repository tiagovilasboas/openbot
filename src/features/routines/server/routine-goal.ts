import type { BotGoal } from "../../bots/bot-goal.ts";
import { buildGoalBlock } from "../../bots/bot-goal-prompt.ts";
import type { Language } from "../../language/language.ts";
import { MAX_PROMPT_LENGTH } from "../routine-input.ts";

/**
 * A linked routine's message with the bot's goal in front of it. The goal
 * only takes the room the message leaves, so the request stays valid; a goal
 * that is not active adds nothing.
 */
export function withGoalContext(
  prompt: string,
  goal: BotGoal | undefined,
  language: Language,
): string {
  const block = buildGoalBlock(
    goal,
    language,
    MAX_PROMPT_LENGTH - prompt.length - 2,
  );
  return block ? `${block}\n\n${prompt}` : prompt;
}
