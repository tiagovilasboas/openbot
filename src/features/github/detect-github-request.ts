import { parseRepoReference } from "./parse-repo-reference.ts";
import type { GitHubRepoRef } from "./github-types.ts";

export type DetectedGitHubRequest =
  | {
      isGitHubRequest: true;
      repo: GitHubRepoRef;
      itemType: "all" | "issues" | "prs";
    }
  | {
      isGitHubRequest: false;
    };

const ignoredOwners = new Set([
  "e",
  "ou",
  "and",
  "or",
  "se",
  "if",
  "sim",
  "nao",
  "yes",
  "no",
]);

// 1. Matches URLs like https://github.com/owner/repo...
const githubUrlPattern =
  /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/i;

// 2. Matches phrases like "issues de owner/repo", "prs de owner/repo", "repo owner/repo"
const prefixPattern =
  /\b(?:issues?|prs?|pull\s*requests?|repo|reposit[oó]rio|bugs?|tarefas?)\s+(?:d[oe]|em|for|from|in|do|da|of|about)?\s*[:\s]*([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/i;

// 3. Matches phrases like "owner/repo issues", "owner/repo prs"
const suffixPattern =
  /\b([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\s+(?:issues?|prs?|pull\s*requests?|bugs?)\b/i;

export function detectGitHubRequest(input: string): DetectedGitHubRequest {
  const trimmed = input.trim();
  if (!trimmed) return { isGitHubRequest: false };

  let owner: string | undefined;
  let repo: string | undefined;

  const urlMatch = githubUrlPattern.exec(trimmed);
  if (urlMatch) {
    owner = urlMatch[1];
    repo = urlMatch[2];
  } else {
    const prefixMatch = prefixPattern.exec(trimmed);
    if (prefixMatch) {
      owner = prefixMatch[1];
      repo = prefixMatch[2];
    } else {
      const suffixMatch = suffixPattern.exec(trimmed);
      if (suffixMatch) {
        owner = suffixMatch[1];
        repo = suffixMatch[2];
      }
    }
  }

  if (!owner || !repo) {
    // Check if whole string is an owner/repo reference
    const directRef = parseRepoReference(trimmed);
    if (directRef) {
      owner = directRef.owner;
      repo = directRef.repo;
    }
  }

  if (!owner || !repo) {
    return { isGitHubRequest: false };
  }

  if (ignoredOwners.has(owner.toLowerCase())) {
    return { isGitHubRequest: false };
  }

  const normalized = parseRepoReference(`${owner}/${repo}`);
  if (!normalized) {
    return { isGitHubRequest: false };
  }

  const lower = trimmed.toLowerCase();
  let itemType: "all" | "issues" | "prs" = "all";
  if (
    lower.includes("pr ") ||
    lower.includes("prs") ||
    lower.includes("pull request")
  ) {
    if (!lower.includes("issue") && !lower.includes("bug")) {
      itemType = "prs";
    }
  } else if (lower.includes("issue") || lower.includes("bug")) {
    itemType = "issues";
  }

  return {
    isGitHubRequest: true,
    repo: normalized,
    itemType,
  };
}
