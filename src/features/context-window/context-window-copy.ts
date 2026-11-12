import type { ChatLanguage } from "../chat/respond-to-message.ts";
import {
  COMPACTION_THRESHOLD,
  type ContextBudget,
} from "./calculate-context-budget.ts";

export interface ContextWindowCopy {
  usage: (percent: string) => string;
  nearlyFull: (percent: string) => string;
}

export const contextWindowCopy: Record<ChatLanguage, ContextWindowCopy> = {
  pt: {
    usage: (p) => `${p}% do contexto`,
    nearlyFull: (p) => `${p}% do contexto, quase cheio`,
  },
  en: {
    usage: (p) => `${p}% of context`,
    nearlyFull: (p) => `${p}% of context, nearly full`,
  },
  es: {
    usage: (p) => `${p}% del contexto`,
    nearlyFull: (p) => `${p}% del contexto, casi lleno`,
  },
};

export interface ContextUsageLabel {
  text: string;
  isWarning: boolean;
}

/** The pill text for a budget; the warning wording does not rely on colour. */
export function contextUsageLabel(
  budget: ContextBudget,
  language: ChatLanguage,
): ContextUsageLabel {
  const rounded = Math.round(budget.usageRatio * 100);
  // A thread that holds anything never reads as empty.
  const percent =
    rounded === 0 && budget.totalEstimatedTokens > 0 ? "<1" : String(rounded);
  const copy = contextWindowCopy[language];
  const isWarning = budget.usageRatio >= COMPACTION_THRESHOLD;
  return {
    text: isWarning ? copy.nearlyFull(percent) : copy.usage(percent),
    isWarning,
  };
}
