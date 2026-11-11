import type { Language } from "../language/language.ts";
import { getSummaryCopy, type SummaryCopy } from "./summary-copy.ts";
import type { SummaryDataSource, SummaryRequestKind } from "./summary-types.ts";

function describeGitHubError(
  error: NonNullable<SummaryDataSource["githubError"]>,
  data: SummaryDataSource,
  copy: SummaryCopy,
): string {
  if (error === "rate_limited") return copy.rateLimited;
  if (error === "repo_not_found") {
    return copy.repoNotFound(`${data.repo?.owner}/${data.repo?.repo}`);
  }
  if (error === "unauthorized") return copy.unauthorized;
  return copy.network;
}

export function generateDeterministicSummary(
  data: SummaryDataSource,
  language: Language,
  kind: SummaryRequestKind = "repo_summary",
): string {
  const copy = getSummaryCopy(language);
  const lines: string[] = [];

  // 1. Header
  if (kind === "daily_briefing") {
    lines.push(copy.dailyBriefing);
  } else if (data.repo) {
    lines.push(copy.repoSummary(`${data.repo.owner}/${data.repo.repo}`));
  } else {
    lines.push(copy.dataSummary);
  }
  lines.push("");

  // 2. Partial Failures (transparency rule)
  if (data.githubError) {
    lines.push(
      copy.partialFailure(describeGitHubError(data.githubError, data, copy)),
    );
    lines.push("");
  }

  // 3. Verified facts - GitHub
  const items = data.items ?? [];
  const prs = items.filter((i) => i.isPullRequest);
  const issues = items.filter((i) => !i.isPullRequest);

  if (items.length > 0) {
    lines.push(copy.overview(items.length));
    lines.push(copy.openPullRequests(prs.length));
    lines.push(copy.openIssues(issues.length));
    lines.push("");

    if (prs.length > 0) {
      lines.push(copy.recentPullRequests);
      for (const pr of prs.slice(0, 5)) {
        lines.push(`- **#${pr.number}** ${pr.title} (@${pr.author})`);
      }
      lines.push("");
    }

    if (issues.length > 0) {
      lines.push(copy.recentIssues);
      for (const issue of issues.slice(0, 5)) {
        const labelsStr =
          issue.labels.length > 0 ? ` [${issue.labels.join(", ")}]` : "";
        lines.push(
          `- **#${issue.number}** ${issue.title} (@${issue.author})${labelsStr}`,
        );
      }
      lines.push("");
    }
  } else if (!data.githubError && data.repo) {
    lines.push(copy.noOpenItems(`${data.repo.owner}/${data.repo.repo}`));
    lines.push("");
  }

  // 4. Suggested next steps (kept apart from the facts)
  lines.push(copy.nextSteps);
  if (prs.length > 0) lines.push(copy.reviewPullRequests);
  if (issues.length > 0) lines.push(copy.triageIssues);
  if (prs.length === 0 && issues.length === 0) lines.push(copy.nothingPending);
  lines.push("");

  // 5. Sources footer
  lines.push(copy.sources);

  return lines.join("\n");
}
