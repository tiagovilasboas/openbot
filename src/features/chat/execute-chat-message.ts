import type { BotProfile } from "@/features/bots/bot-types.ts";
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
}

export async function executeChatMessage({
  text,
  language,
  history,
  activeBot,
  bots = [],
  gitHubToken,
  modelConfig,
}: {
  text: string;
  language: ChatLanguage;
  history: Array<{ role: "assistant" | "user"; text: string }>;
  activeBot: BotProfile;
  bots?: BotProfile[];
  gitHubToken: string | null;
  modelConfig: ClientModelConfig | null;
}): Promise<ChatReplyOutcome> {
  const content = chatCopy[language];
  const isPt = language === "pt";

  // Check if user delegated to a specific bot via @mention
  const mentionedBot = findMentionedBot(text, bots);
  const executingBot =
    mentionedBot && mentionedBot.id !== activeBot.id ? mentionedBot : activeBot;
  const delegatedBot =
    mentionedBot && mentionedBot.id !== activeBot.id ? mentionedBot : undefined;

  const baseDescription =
    (executingBot.id === "chief-of-staff" || executingBot.id === "default") &&
    !isPt &&
    executingBot.description.includes("Você é o Chief of Staff")
      ? "You are the Chief of Staff, the general coordinator of the bot team. Your role is to plan, synthesize repository/calendar information, and coordinate/delegate tasks to specialist bots when needed."
      : executingBot.description;

  // Build system prompt from executing bot + workspace context + enabled skills
  const workspaceSnippet = executingBot.workspaceContext
    ? `\n\n${isPt ? "Contexto de Workspace:" : "Workspace Context:"}\n${executingBot.workspaceContext}`
    : "";
  const skillSnippets = executingBot.skills
    .map((s) => `[Skill ${s.name} (${s.command})]: ${s.instructions}`)
    .join("\n");
  const fullSystemPrompt = skillSnippets
    ? `${baseDescription}${workspaceSnippet}\n\n${isPt ? "Skills Habilitadas:" : "Enabled Skills:"}\n${skillSnippets}`
    : `${baseDescription}${workspaceSnippet}`;

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
    return {
      text: outcome.text,
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
