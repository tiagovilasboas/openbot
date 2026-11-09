import { parseRepoReference } from "../github/parse-repo-reference.ts";
import type { GitHubRepoRef } from "../github/github-types.ts";
import type { DetectedSummaryRequest } from "./summary-types.ts";

const summaryKeywords = [
  "resumo",
  "resuma",
  "resumir",
  "briefing",
  "sintese",
  "síntese",
  "sintetize",
  "panorama",
  "visao geral",
  "visão geral",
  "destaques",
  "summary",
  "summarize",
  "overview",
  "highlights",
  "catch me up",
  "wrap up",
  "brief",
];

const dailyKeywords = [
  "diario",
  "diário",
  "daily",
  "de hoje",
  "today",
  "meu dia",
  "my day",
];

const repoInTextPattern = /\b([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\b/;
const githubUrlPattern =
  /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/i;

const defaultRepo: GitHubRepoRef = {
  owner: "tiagovilasboas",
  repo: "openbot",
};

export function detectSummaryRequest(input: string): DetectedSummaryRequest {
  const trimmed = input.trim();
  if (!trimmed) return { isSummary: false };

  const lower = trimmed.toLowerCase();

  const hasSummaryKeyword = summaryKeywords.some((word) =>
    lower.includes(word),
  );
  const hasDailyKeyword = dailyKeywords.some((word) => lower.includes(word));

  // If there's neither a summary keyword nor a daily briefing request, return false
  if (
    !hasSummaryKeyword &&
    !(
      lower.includes("briefing") ||
      (hasDailyKeyword && lower.includes("o que"))
    )
  ) {
    return { isSummary: false };
  }

  // Extract repo if present
  let foundRepo: GitHubRepoRef | null = null;
  const urlMatch = githubUrlPattern.exec(trimmed);
  if (urlMatch) {
    foundRepo = parseRepoReference(`${urlMatch[1]}/${urlMatch[2]}`);
  } else {
    const repoMatch = repoInTextPattern.exec(trimmed);
    if (repoMatch) {
      foundRepo = parseRepoReference(`${repoMatch[1]}/${repoMatch[2]}`);
    }
  }

  // If explicit repo found
  if (foundRepo) {
    return {
      isSummary: true,
      kind: "repo_summary",
      repo: foundRepo,
    };
  }

  // If no repo found, but daily briefing / general summary intent
  if (
    hasDailyKeyword ||
    lower.includes("briefing") ||
    lower.includes("resumo")
  ) {
    return {
      isSummary: true,
      kind: "daily_briefing",
      repo: defaultRepo,
    };
  }

  return { isSummary: false };
}
