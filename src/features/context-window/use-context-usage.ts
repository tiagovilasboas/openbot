"use client";

import { useMemo } from "react";
import { buildBotSystemPrompt } from "../bots/bot-system-prompt.ts";
import type { BotProfile } from "../bots/bot-types.ts";
import type { HistoryMessage } from "../chat/request-history.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { calculateContextBudget } from "./calculate-context-budget.ts";
import {
  contextUsageLabel,
  type ContextUsageLabel,
} from "./context-window-copy.ts";

/**
 * The label for the model pill: how full the window is for this thread and
 * bot. Undefined while no model is known, so the pill shows no guess.
 */
export function useContextUsage(
  messages: HistoryMessage[],
  model: string | undefined,
  bot: BotProfile,
  language: ChatLanguage,
): ContextUsageLabel | undefined {
  return useMemo(() => {
    if (!model) return undefined;
    const systemPrompt = buildBotSystemPrompt(bot, language);
    const budget = calculateContextBudget(messages, model, { systemPrompt });
    return contextUsageLabel(budget, language);
  }, [messages, model, bot, language]);
}
