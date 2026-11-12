import type { DetectedGitHubRequest } from "@/features/github/detect-github-request.ts";
import type {
  GitHubItem,
  GitHubRepoRef,
} from "@/features/github/github-types.ts";
import { listRepositoryItems } from "@/features/github/list-repository-items.ts";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

type Detected = Extract<DetectedGitHubRequest, { isGitHubRequest: true }>;

/** Answers "list the open items of owner/repo" without the model. */
export async function githubRequestReply(
  detected: Detected,
  gitHubToken: string | null,
  language: ChatLanguage,
): Promise<{
  text: string;
  github?: { repo: GitHubRepoRef; items: GitHubItem[] };
}> {
  const content = chatCopy[language];
  const result = await listRepositoryItems(detected.repo, gitHubToken);
  if (!result.ok) {
    const text =
      result.error === "repo_not_found"
        ? content.githubRepoNotFound
        : result.error === "rate_limited"
          ? content.githubRateLimited
          : result.error === "unauthorized"
            ? content.githubUnauthorized
            : content.githubNetworkError;
    return { text };
  }
  let items = result.items;
  if (detected.itemType === "prs") {
    items = items.filter((item) => item.isPullRequest);
  } else if (detected.itemType === "issues") {
    items = items.filter((item) => !item.isPullRequest);
  }
  const one = items.length === 1;
  const labelKind =
    detected.itemType === "prs"
      ? one
        ? content.githubPR
        : content.githubPRs
      : detected.itemType === "issues"
        ? one
          ? content.githubIssue
          : content.githubIssues
        : one
          ? content.githubOpenItem
          : content.githubOpenItems;
  const text = content.githubFound
    .replace("{count}", String(items.length))
    .replace("{kind}", labelKind)
    .replace("{repo}", `${detected.repo.owner}/${detected.repo.repo}`);
  return { text, github: { repo: detected.repo, items } };
}
