import type { MessageData } from "../chat/ChatMessageItem.tsx";
import { requestModelReply } from "../chat/request-model-reply.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { threadUpTo } from "../chat/thread-sequencing.ts";
import { calculateContextBudget } from "../context-window/index.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import type { TokenUsage } from "../model/token-usage.ts";
import { applyCompaction, planStillFits } from "./apply-compaction.ts";
import { SUMMARY_MAX_CHARS } from "./compaction-types.ts";
import { historyFromThread } from "./history-from-thread.ts";
import { planCompaction } from "./plan-compaction.ts";
import { buildSummarizePrompt } from "./summarize-prompt.ts";

export interface CompactBeforeTurnInput {
  /** The stored thread now; read again after the summary, never trusted stale. */
  readThread: () => MessageData[];
  /** The turn's own user message; it always stays in the recent part. */
  userMessageId: number;
  language: ChatLanguage;
  /** The model id the budget is measured against; unknown reads as small. */
  model: string | undefined;
  systemPrompt: string;
  modelConfig: ClientModelConfig | null;
  /** The bot's own model for the summary call, like any other call of it. */
  modelId?: string;
  botId: string;
  signal?: AbortSignal;
  /** Stores the compacted thread through the usual persistence (and sync). */
  persist: (thread: MessageData[]) => void;
  onUsage?: (botId: string, usage: TokenUsage | undefined) => void;
  request?: typeof requestModelReply;
  now?: () => Date;
}

/**
 * Before a turn is sent: when the thread fills the window, folds the old
 * turns into a summary the model writes. Any failure (no answer, an empty
 * answer, a thread that changed meanwhile, a cancel) leaves the thread as it
 * was, so the turn is simply sent without compaction. Returns whether the
 * thread was compacted.
 */
export async function compactBeforeTurn(
  input: CompactBeforeTurnInput,
): Promise<boolean> {
  const prefix = threadUpTo(input.readThread(), input.userMessageId);
  const budget = calculateContextBudget(
    historyFromThread(prefix),
    input.model,
    {
      systemPrompt: input.systemPrompt,
    },
  );
  const plan = planCompaction(prefix, budget);
  if (!plan) return false;

  try {
    const ask = input.request ?? requestModelReply;
    const outcome = await ask(
      input.language,
      buildSummarizePrompt(plan.older, input.language),
      fetch,
      input.modelConfig,
      undefined,
      { signal: input.signal, modelId: input.modelId },
    );
    if (outcome.kind !== "text") return false;
    input.onUsage?.(input.botId, outcome.usage);
    const summary = outcome.text.trim().slice(0, SUMMARY_MAX_CHARS);
    if (!summary || input.signal?.aborted) return false;

    const current = input.readThread();
    if (!planStillFits(current, plan)) return false;
    const now = input.now ?? (() => new Date());
    input.persist(applyCompaction(current, plan, summary, now()));
    return true;
  } catch {
    return false;
  }
}
