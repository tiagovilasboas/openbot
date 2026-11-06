import type { GitHubRepoRef } from "./github-types.ts";

// GitHub usernames allow alphanumeric and hyphens; repository names allow alphanumeric, hyphens, underscores, and periods.
const repoPattern =
  /^(?:https?:\/\/github\.com\/)?([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)(?:\/(?:issues|pulls|pull\/.*|tree\/.*)?)?$/;

const reservedOwners = new Set([
  "settings",
  "pulls",
  "issues",
  "notifications",
  "explore",
  "marketplace",
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

export function parseRepoReference(input: string): GitHubRepoRef | null {
  const trimmed = input.trim().replace(/^git@github\.com:/, "");
  const match = repoPattern.exec(trimmed);
  if (!match) return null;

  const owner = match[1].trim();
  const repo = match[2].trim().replace(/\.git$/, "");

  if (!owner || !repo) return null;
  if (reservedOwners.has(owner.toLowerCase())) {
    return null;
  }

  return { owner, repo };
}
