import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { CalendarEvent } from "@/features/calendar/list-example-events.ts";
import { detectGitHubRequest } from "@/features/github/detect-github-request.ts";
import type {
  GitHubItem,
  GitHubRepoRef,
} from "@/features/github/github-types.ts";
import { listRepositoryItems } from "@/features/github/list-repository-items.ts";
import type { ClientModelConfig } from "@/features/model/model-config.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { detectSummaryRequest } from "@/features/summary/detect-summary-request.ts";
import { executeSummary } from "@/features/summary/execute-summary.ts";
import { chatCopy } from "./chat-copy.ts";
import { findMentionedBot } from "./find-mentioned-bot.ts";
import { requestModelReply } from "./request-model-reply.ts";
import { respondToMessage, type ChatLanguage } from "./respond-to-message.ts";

export interface ChatReplyOutcome {
  text: string;
  delegatedBot?: BotProfile;
  events?: CalendarEvent[];
  github?: { repo: GitHubRepoRef; items: GitHubItem[] };
}

export async function executeChatMessage({
  text,
  language,
  history,
  activeBot,
  allSkills,
  bots = [],
  gitHubToken,
  modelConfig,
}: {
  text: string;
  language: ChatLanguage;
  history: Array<{ role: "assistant" | "user"; text: string }>;
  activeBot: BotProfile;
  allSkills: SkillDefinition[];
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

  // Build system prompt from executing bot + enabled custom skills
  const enabledCustomSkills = allSkills.filter(
    (s) => !s.isBuiltin && executingBot.skills.includes(s.id),
  );
  const skillSnippets = enabledCustomSkills
    .map((s) => `[Skill ${s.name} (${s.command})]: ${s.instructions}`)
    .join("\n");
  const fullSystemPrompt = skillSnippets
    ? `${baseDescription}\n\n${isPt ? "Skills Habilitadas:" : "Enabled Skills:"}\n${skillSnippets}`
    : baseDescription;

  // 1. Summary Detection
  const summaryDetected = detectSummaryRequest(text);
  if (summaryDetected.isSummary) {
    if (!executingBot.skills.includes("summary")) {
      return {
        text: isPt
          ? `A skill de **Resumo & Briefing** está desativada no bot **${executingBot.name}**. Habilite-a nas configurações do bot para usar.`
          : `The **Summary & Briefing** skill is disabled on bot **${executingBot.name}**. Enable it in bot settings.`,
        delegatedBot,
      };
    }
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
      events: outcome.events,
      github: outcome.github,
    };
  }

  // 2. GitHub Request Detection
  const githubDetected = detectGitHubRequest(text);
  if (githubDetected.isGitHubRequest) {
    if (!executingBot.skills.includes("github")) {
      return {
        text: isPt
          ? `A skill do **GitHub** está desativada no bot **${executingBot.name}**. Habilite-a nas configurações do bot para consultar repositórios.`
          : `The **GitHub** skill is disabled on bot **${executingBot.name}**. Enable it in bot settings.`,
        delegatedBot,
      };
    }
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

  // 3. Demo / Calendar Detection
  const demo = respondToMessage(text, language);
  if (demo.kind === "calendar") {
    if (!executingBot.skills.includes("calendar")) {
      return {
        text: isPt
          ? `A skill de **Agenda** está desativada no bot **${executingBot.name}**.`
          : `The **Calendar** skill is disabled on bot **${executingBot.name}**.`,
        delegatedBot,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { text: demo.text, events: demo.events, delegatedBot };
  }

  // 4. Model Reply with Bot System Prompt
  const outcome = await requestModelReply(
    language,
    history,
    fetch,
    modelConfig,
    fullSystemPrompt,
  );
  if (outcome.kind === "text") {
    return { text: outcome.text, delegatedBot };
  }
  if (outcome.kind === "unavailable") {
    return { text: demo.text, delegatedBot };
  }
  return { text: content.modelError, delegatedBot };
}
