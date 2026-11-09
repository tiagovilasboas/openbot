import { buildBotSystemPrompt } from "@/features/bots/bot-system-prompt.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { crewCopy } from "@/features/crew/crew-copy.ts";
import { buildCrewRoster } from "@/features/crew/crew-roster.ts";
import { runCrewTurn } from "@/features/crew/run-crew-turn.ts";
import { detectGitHubRequest } from "@/features/github/detect-github-request.ts";
import type {
  GitHubItem,
  GitHubRepoRef,
} from "@/features/github/github-types.ts";
import { listRepositoryItems } from "@/features/github/list-repository-items.ts";
import type { ClientModelConfig } from "@/features/model/model-config.ts";
import type { ModelCallResult } from "@/features/model/model-status.ts";
import { detectSummaryRequest } from "@/features/summary/detect-summary-request.ts";
import { executeSummary } from "@/features/summary/execute-summary.ts";
import { chatCopy } from "./chat-copy.ts";
import { describeModelFailure } from "./describe-model-failure.ts";
import { findMentionedBot } from "./find-mentioned-bot.ts";
import { requestModelReply } from "./request-model-reply.ts";
import {
  getUnconfiguredModelMessage,
  type ChatLanguage,
} from "./respond-to-message.ts";

export interface ChatReplyOutcome {
  text: string;
  delegatedBot?: BotProfile;
  github?: { repo: GitHubRepoRef; items: GitHubItem[] };
  failover?: { fromModel: string; toModel: string; reason: string };
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
  history,
  activeBot,
  bots = [],
  mainBotId,
  gitHubToken,
  modelConfig,
  onBotWorking,
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
}): Promise<ChatReplyOutcome> {
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
      const labelKind =
        githubDetected.itemType === "prs"
          ? content.githubPRs
          : githubDetected.itemType === "issues"
            ? content.githubIssues
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
  const outcome = await requestModelReply(
    language,
    history,
    fetch,
    modelConfig,
    fullSystemPrompt,
  );
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
          askModel: async ({ systemPrompt, messages }) => {
            const reply = await requestModelReply(
              language,
              messages,
              fetch,
              modelConfig,
              systemPrompt,
            );
            return reply.kind === "text"
              ? { ok: true, text: reply.text }
              : { ok: false };
          },
        })
      : null;
    return {
      text: crewTurn
        ? (crewTurn.synthesis ?? crewCopy[language].synthesisFailed)
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
  return {
    text: describeModelFailure(outcome.failure, language),
    delegatedBot,
    modelCall: "failed",
  };
}
