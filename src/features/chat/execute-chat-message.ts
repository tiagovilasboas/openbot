import type { AttachmentPayload } from "@/features/attachments/parse-attachments.ts";
import { historyByteBudget } from "@/features/attachments/request-size.ts";
import { buildBotSystemPrompt } from "@/features/bots/bot-system-prompt.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { chiefPlainReply } from "@/features/crew/chief-plain-reply.ts";
import { crewCopy } from "@/features/crew/crew-copy.ts";
import { buildCrewRoster } from "@/features/crew/crew-roster.ts";
import { liveChiefText } from "@/features/crew/live-chief-text.ts";
import { parseDelegations } from "@/features/crew/parse-delegations.ts";
import { runCrewTurn } from "@/features/crew/run-crew-turn.ts";
import { detectGitHubRequest } from "@/features/github/detect-github-request.ts";
import type {
  GitHubItem,
  GitHubRepoRef,
} from "@/features/github/github-types.ts";
import { listRepositoryItems } from "@/features/github/list-repository-items.ts";
import type { ModelFailure } from "@/features/model/classify-model-failure.ts";
import type { ClientModelConfig } from "@/features/model/model-config.ts";
import { memoryTextsForRequest } from "@/features/memory/memory-request.ts";
import type { ModelCallResult } from "@/features/model/model-status.ts";
import { detectSummaryRequest } from "@/features/summary/detect-summary-request.ts";
import { executeSummary } from "@/features/summary/execute-summary.ts";
import { chatCopy } from "./chat-copy.ts";
import { describeModelFailure } from "./describe-model-failure.ts";
import { findMentionedBot } from "./find-mentioned-bot.ts";
import { createLiveBoard, type LiveEntry } from "./live-board.ts";
import { fitHistoryToBytes, limitHistory } from "./request-history.ts";
import { requestModelReply } from "./request-model-reply.ts";
import { requestModelStream } from "./request-model-stream.ts";
import {
  getUnconfiguredModelMessage,
  type ChatLanguage,
} from "./respond-to-message.ts";

export interface ChatReplyOutcome {
  text: string;
  delegatedBot?: BotProfile;
  github?: { repo: GitHubRepoRef; items: GitHubItem[] };
  failover?: { fromModel: string; toModel: string; reason: string };
  /** The text is what arrived before the reply broke off or was cancelled. */
  incomplete?: "error" | "cancelled";
  /** Set when the turn reached the model, so the header dot can follow it. */
  modelCall?: ModelCallResult;
  /** Set when the Chief delegated: its kickoff and each specialist's reply. */
  crew?: {
    kickoff: string;
    specialists: Array<{ bot: BotProfile; text: string }>;
  };
}

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
}: {
  text: string;
  language: ChatLanguage;
  history: Array<{ role: "assistant" | "user"; text: string }>;
  activeBot: BotProfile;
  bots?: BotProfile[];
  /** The bot the user made main; it leads the crew as the Chief. */
  mainBotId?: string;
  gitHubToken: string | null;
  modelConfig: ClientModelConfig | null;
  /** Follows which bot is working while the Chief's crew answers. */
  onBotWorking?: (bot: BotProfile) => void;
  /**
   * Streams the model replies and reports the replies in progress. Without
   * it the turn uses the plain, non-stream route.
   */
  onLive?: (entries: LiveEntry[]) => void;
  /** The user's cancel signal; each model call also has its own time limit. */
  signal?: AbortSignal;
  /** A bot's memory notes; defaults to what the user saved on this device. */
  memoryFor?: (botId: string) => string[];
  /**
   * Files for this turn, raw name and text. Only the first model call gets
   * them: a delegated specialist is not sent the user's files.
   */
  attachments?: AttachmentPayload[];
}): Promise<ChatReplyOutcome> {
  // The server caps the history; send only the newest messages, and fewer
  // when files take room in the request body.
  const limited = limitHistory(fullHistory);
  const history =
    attachments.length > 0
      ? fitHistoryToBytes(limited, historyByteBudget(attachments))
      : limited;
  const content = chatCopy[language];
  const isPt = language === "pt";

  // Check if user delegated to a specific bot via @mention
  const mentionedBot = findMentionedBot(text, bots);
  const executingBot =
    mentionedBot && mentionedBot.id !== activeBot.id ? mentionedBot : activeBot;
  const delegatedBot =
    mentionedBot && mentionedBot.id !== activeBot.id ? mentionedBot : undefined;

  const botPrompt = buildBotSystemPrompt(executingBot, language);
  // The main bot plays the Chief: it knows the crew and can delegate.
  const isChief = executingBot.id === mainBotId;
  const crewRoster = isChief
    ? buildCrewRoster(executingBot, bots, language)
    : "";
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
    const result = await listRepositoryItems(githubDetected.repo, gitHubToken);
    if (result.ok) {
      let items = result.items;
      if (githubDetected.itemType === "prs") {
        items = items.filter((item) => item.isPullRequest);
      } else if (githubDetected.itemType === "issues") {
        items = items.filter((item) => !item.isPullRequest);
      }
      const one = items.length === 1;
      const labelKind =
        githubDetected.itemType === "prs"
          ? one
            ? content.githubPR
            : content.githubPRs
          : githubDetected.itemType === "issues"
            ? one
              ? content.githubIssue
              : content.githubIssues
            : one
              ? content.githubOpenItem
              : content.githubOpenItems;
      const summaryText = isPt
        ? `Encontrei ${items.length} ${labelKind} em ${githubDetected.repo.owner}/${githubDetected.repo.repo}:`
        : `Found ${items.length} ${labelKind} in ${githubDetected.repo.owner}/${githubDetected.repo.repo}:`;
      return {
        text: summaryText,
        delegatedBot,
        github: { repo: githubDetected.repo, items },
      };
    }
    const errorText =
      result.error === "repo_not_found"
        ? content.githubRepoNotFound
        : result.error === "rate_limited"
          ? content.githubRateLimited
          : result.error === "unauthorized"
            ? content.githubUnauthorized
            : content.githubNetworkError;
    return { text: errorText, delegatedBot };
  }

  // 3. Model Reply with Bot System Prompt
  const board = onLive ? createLiveBoard(onLive) : null;
  /** One model call; with a live board its text shows as it arrives. */
  const ask = (
    system: string,
    messages: typeof history,
    modelId: string | undefined,
    memory: string[] | undefined,
    speaker: BotProfile | undefined,
    shape: (text: string) => string = (text) => text,
    files?: AttachmentPayload[],
  ) => {
    const options = { signal, modelId, memory, attachments: files };
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
  const failedReply = (failure: ModelFailure): ChatReplyOutcome => ({
    text: describeModelFailure(failure, language),
    delegatedBot,
    // A cancel is the user's choice, not the model failing: no failed status.
    ...(failure.kind === "cancelled" ? {} : { modelCall: "failed" as const }),
  });

  const outcome = await ask(
    fullSystemPrompt,
    history,
    executingBot.modelId,
    memoryFor(executingBot.id),
    undefined,
    isChief ? (t) => liveChiefText(t, bots, executingBot.id) : undefined,
    attachments,
  );
  if (outcome.kind === "partial") {
    // Keep what arrived; a Chief's delegation lines are not part of it.
    const kept = isChief
      ? parseDelegations(outcome.text, bots, executingBot.id).visibleText
      : outcome.text;
    if (!kept) return failedReply(outcome.failure);
    return {
      ...failedReply(outcome.failure),
      text: kept,
      incomplete: outcome.failure.kind === "cancelled" ? "cancelled" : "error",
    };
  }
  if (outcome.kind === "text") {
    const crewTurn = isChief
      ? await runCrewTurn({
          chief: executingBot,
          chiefPrompt: botPrompt,
          chiefReply: outcome.text,
          bots,
          history,
          userText: text,
          language,
          onBotWorking,
          memoryFor,
          onKickoff: (kickoff) => board?.settle(kickoff),
          askModel: async ({
            systemPrompt,
            messages,
            modelId,
            memory,
            speaker,
          }) => {
            const reply = await ask(
              systemPrompt,
              messages,
              modelId,
              memory,
              speaker,
            );
            if (reply.kind !== "text") {
              board?.drop();
              return { ok: false };
            }
            board?.keep();
            return { ok: true, text: reply.text };
          },
        })
      : null;
    return {
      text: crewTurn
        ? (crewTurn.synthesis ?? crewCopy[language].synthesisFailed)
        : isChief
          ? chiefPlainReply(outcome.text, bots, executingBot.id, language)
          : outcome.text,
      ...(crewTurn
        ? {
            crew: {
              kickoff: crewTurn.kickoff,
              specialists: crewTurn.specialists.map(({ bot, text }) => ({
                bot,
                text,
              })),
            },
          }
        : {}),
      delegatedBot,
      modelCall: "ok",
      ...(outcome.failover ? { failover: outcome.failover } : {}),
    };
  }
  if (outcome.kind === "unavailable") {
    return { text: getUnconfiguredModelMessage(language), delegatedBot };
  }
  return failedReply(outcome.failure);
}
