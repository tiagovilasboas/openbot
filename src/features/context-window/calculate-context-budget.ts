import { limitHistory, type HistoryMessage } from "../chat/request-history.ts";
import { contextWindowFor } from "./model-context-window.ts";

export interface ContextBudget {
  totalEstimatedTokens: number;
  maxWindowTokens: number;
  /** 0.0 to 1.0 (capped). */
  usageRatio: number;
  isCompactionRecommended: boolean;
}

/** The share of the window from which compaction is recommended. */
export const COMPACTION_THRESHOLD = 0.75;

const CHARS_PER_TOKEN = 4;

export interface ContextBudgetOptions {
  /** The system prompt sent with the turn. */
  systemPrompt?: string;
  /** Bytes of files sent with the last turn; they are not kept in messages. */
  attachmentBytes?: number;
}

/**
 * Estimates how much of the model's window the next request fills, with the
 * 4 characters per token heuristic. Only what is sent counts: the newest
 * messages (the same limit as the request) plus the system prompt.
 * Real token usage is kept per bot and day, not per thread, so it is not used.
 */
export function calculateContextBudget(
  messages: HistoryMessage[],
  model: string | undefined,
  options: ContextBudgetOptions = {},
): ContextBudget {
  const sent = limitHistory(messages);
  const chars =
    sent.reduce((sum, m) => sum + m.text.length, 0) +
    (options.systemPrompt?.length ?? 0) +
    (options.attachmentBytes ?? 0);
  const totalEstimatedTokens = Math.ceil(chars / CHARS_PER_TOKEN);
  const maxWindowTokens = contextWindowFor(model);
  const usageRatio = Math.min(1, totalEstimatedTokens / maxWindowTokens);
  return {
    totalEstimatedTokens,
    maxWindowTokens,
    usageRatio,
    isCompactionRecommended: usageRatio >= COMPACTION_THRESHOLD,
  };
}
