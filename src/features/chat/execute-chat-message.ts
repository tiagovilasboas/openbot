import type { AttachmentPayload } from "@/features/attachments/parse-attachments.ts";
import { historyByteBudget } from "@/features/attachments/request-size.ts";
import { buildBotSystemPrompt } from "@/features/bots/bot-system-prompt.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { crewCopy } from "@/features/crew/crew-copy.ts";
import { buildCrewRoster } from "@/features/crew/crew-roster.ts";
import { liveChiefText } from "@/features/crew/live-chief-text.ts";
import { parseDelegations } from "@/features/crew/parse-delegations.ts";
import { detectGitHubRequest } from "@/features/github/detect-github-request.ts";
import type { LiveToolStep } from "@/features/tools/client/live-tool-steps.ts";
import { toolTurnFor } from "@/features/tools/client/tool-route.ts";
import type { ModelFailure } from "@/features/model/classify-model-failure.ts";
import type { ClientModelConfig } from "@/features/model/model-config.ts";
import { memoryTextsForRequest } from "@/features/memory/memory-request.ts";
import type { TokenUsage } from "@/features/model/token-usage.ts";
import { recordUsageCall } from "@/features/usage/usage-storage.ts";
import { detectSummaryRequest } from "@/features/summary/detect-summary-request.ts";
import { executeSummary } from "@/features/summary/execute-summary.ts";
import type { ExecuteChatMessageInput } from "./execute-chat-message-input.ts";
import type { ChatReplyOutcome } from "./chat-reply-outcome.ts";
import { findMentionedBot } from "./find-mentioned-bot.ts";
import { failedReply as modelFailureReply } from "./model-failure-reply.ts";
import { githubRequestReply } from "./github-request-reply.ts";
import { crewTurnReply } from "./crew-turn-reply.ts";
import { createLiveBoard, type LiveEntry } from "./live-board.ts";
import { fitHistoryToBytes, limitHistory } from "./request-history.ts";
import { incompleteKindOf } from "./incomplete-reply.ts";
import { requestModelReply } from "./request-model-reply.ts";
import { requestModelStream } from "./request-model-stream.ts";
import {
  getUnconfiguredModelMessage,
  type ChatLanguage,
} from "./respond-to-message.ts";
import { streamToolTurn } from "./tool-turn-reply.ts";

export async function executeChatMessage({
  text,
  language,
  history: fullHistory,
  activeBot,
  bots = [],
  mainBotId,
  gitHubToken,
  modelConfig,
  onBotWorking,
  onLive,
  signal,
  memoryFor = memoryTextsForRequest,
  attachments = [],
  clientMessageId,
  onUsage = recordUsageCall,
  onMemoryChanged = () => undefined,
  onToolSteps,
}: ExecuteChatMessageInput): Promise<ChatReplyOutcome> {
  // The server caps the history; send only the newest messages, and fewer
  // when files take room in the request body.
  const limited = limitHistory(fullHistory);
  const history =
    attachments.length > 0
      ? fitHistoryToBytes(limited, historyByteBudget(attachments))
      : limited;
  const countUsage = (botId: string, usage: TokenUsage | undefined) => {
    try {
      onUsage(botId, usage);
    } catch {
      // Counting must never break the turn.
    }
  };

  // Check if user delegated to a specific bot via @mention
  const mentionedBot = findMentionedBot(text, bots);
  const executingBot =
    mentionedBot && mentionedBot.id !== activeBot.id ? mentionedBot : activeBot;
  const delegatedBot =
    mentionedBot && mentionedBot.id !== activeBot.id ? mentionedBot : undefined;

  // The main bot plays the Chief: it knows the crew and can delegate.
  const isChief = executingBot.id === mainBotId;
  const crewRoster = isChief
    ? buildCrewRoster(executingBot, bots, language)
    : "";
  // The roster and the synthesis rule come after the bot's own text, so the
  // bot's text is built to leave them room instead of being cut ahead of them.
  const botPrompt = buildBotSystemPrompt(
    executingBot,
    language,
    isChief
      ? Math.max(crewRoster.length, crewCopy[language].synthesisRule.length) + 2
      : 0,
  );
  const fullSystemPrompt = crewRoster
    ? `${botPrompt}\n\n${crewRoster}`
    : botPrompt;

  // 1. Summary Detection
  const summaryDetected = detectSummaryRequest(text);
  if (summaryDetected.isSummary) {
    const outcome = await executeSummary(
      summaryDetected,
      language,
      text,
      gitHubToken,
      modelConfig,
      undefined,
      executingBot.modelId,
    );
    return {
      text: outcome.text,
      delegatedBot,
      github: outcome.github,
    };
  }

  // 2. GitHub Request Detection
  const githubDetected = detectGitHubRequest(text);
  if (githubDetected.isGitHubRequest) {
    const reply = await githubRequestReply(
      githubDetected,
      gitHubToken,
      language,
    );
    return { ...reply, delegatedBot };
  }

  // 3. Model Reply with Bot System Prompt
  const board = onLive ? createLiveBoard(onLive) : null;
  // A single bot that opted in streams through the tool route; never a crew.
  const tools =
    board && !isChief ? toolTurnFor(executingBot, false) : undefined;
  if (board && tools) {
    const result = await streamToolTurn({
      request: {
        language,
        messages: history,
        config: modelConfig,
        systemPrompt: fullSystemPrompt,
        modelId: executingBot.modelId,
        memory: memoryFor(executingBot.id),
        attachments,
      },
      tools,
      signal,
      show: board.stream(delegatedBot),
      onMemoryChanged,
      onToolSteps,
    });
    if (result.produced) countUsage(executingBot.id, result.usage);
    return { ...result.reply, delegatedBot };
  }
  /** One model call; with a live board its text shows as it arrives. */
  const ask = (
    system: string,
    messages: typeof history,
    modelId: string | undefined,
    memory: string[] | undefined,
    speaker: BotProfile | undefined,
    shape: (text: string) => string = (text) => text,
    files?: AttachmentPayload[],
    sendId?: string,
  ) => {
    const options = {
      signal,
      clientMessageId: sendId,
      modelId,
      backupModelIds: (speaker ?? executingBot).backupModelIds,
      memory,
      attachments: files,
    };
    if (!board) {
      return requestModelReply(
        language,
        messages,
        fetch,
        modelConfig,
        system,
        options,
      );
    }
    const show = board.stream(speaker ?? delegatedBot);
    return requestModelStream(language, messages, fetch, modelConfig, system, {
      ...options,
      onText: (text) => show(shape(text)),
    });
  };
  /**
   * `ask`, plus the usage log: a reply counts for the bot that wrote it (the
   * Chief's own synthesis counts for the Chief). A reply cut off midway has no
   * provider counts, so it is logged as a reply without usage data.
   */
  const askAndCount = async (...args: Parameters<typeof ask>) => {
    const outcome = await ask(...args);
    if (outcome.kind === "text" || outcome.kind === "partial") {
      const usage = outcome.kind === "text" ? outcome.usage : undefined;
      const speaker: BotProfile | undefined = args[4];
      countUsage((speaker ?? executingBot).id, usage);
    }
    return outcome;
  };
  const failedReply = (failure: ModelFailure) =>
    modelFailureReply(failure, language, delegatedBot);

  const outcome = await askAndCount(
    fullSystemPrompt,
    history,
    executingBot.modelId,
    memoryFor(executingBot.id),
    undefined,
    isChief ? (t) => liveChiefText(t, bots, executingBot.id) : undefined,
    attachments,
    clientMessageId,
  );
  if (outcome.kind === "partial") {
    // Keep what arrived; a Chief's delegation lines are not part of it.
    const kept = isChief
      ? parseDelegations(outcome.text, bots, executingBot.id).visibleText
      : outcome.text;
    if (!kept) return failedReply(outcome.failure);
    // Text arrived: it is an answer cut short, not an error message.
    const { failure: _failure, ...cutShort } = failedReply(outcome.failure);
    return {
      ...cutShort,
      text: kept,
      incomplete: incompleteKindOf(outcome.failure),
    };
  }
  if (outcome.kind === "text") {
    return crewTurnReply({
      reply: outcome,
      executingBot,
      delegatedBot,
      isChief,
      botPrompt,
      bots,
      history,
      text,
      language,
      board,
      onBotWorking,
      memoryFor,
      askAndCount,
    });
  }
  if (outcome.kind === "unavailable") {
    return {
      text: getUnconfiguredModelMessage(language),
      delegatedBot,
      failure: "unconfigured",
    };
  }
  // The plain routes never pause, so only an error is left.
  return failedReply(
    outcome.kind === "error" ? outcome.failure : { kind: "unknown" },
  );
}
