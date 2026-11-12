import type { MessageData } from "../chat/ChatMessageItem.tsx";
import type { ContextBudget } from "../context-window/index.ts";

export function msg(
  id: number,
  role: "user" | "assistant",
  text = `${role} ${id}`,
  extra: Partial<MessageData> = {},
): MessageData {
  return { id, role, language: "en", text, ...extra };
}

/** A thread of `pairs` user/assistant exchanges, ids from 1. */
export function thread(pairs: number): MessageData[] {
  return Array.from({ length: pairs * 2 }, (_, i) =>
    msg(i + 1, i % 2 === 0 ? "user" : "assistant"),
  );
}

export const FULL: ContextBudget = {
  totalEstimatedTokens: 30_000,
  maxWindowTokens: 32_768,
  usageRatio: 0.92,
  isCompactionRecommended: true,
};

export const ROOMY: ContextBudget = {
  totalEstimatedTokens: 100,
  maxWindowTokens: 32_768,
  usageRatio: 0.003,
  isCompactionRecommended: false,
};
