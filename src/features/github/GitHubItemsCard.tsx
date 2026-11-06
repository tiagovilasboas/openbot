"use client";

import { Chip } from "@heroui/react";
import { chatCopy } from "@/features/chat/chat-copy";
import type { ChatLanguage } from "@/features/chat/respond-to-message";
import type { GitHubItem, GitHubRepoRef } from "./github-types.ts";

interface GitHubItemsCardProps {
  repo: GitHubRepoRef;
  items: GitHubItem[];
  language: ChatLanguage;
}

function PRIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "size-4 text-purple-400"}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.5 5.396V4.75a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1 0-1.5h.646L5.823 4.957a.75.75 0 0 1 1.06-1.06ZM13.5 12.75a2.25 2.25 0 1 1-3-2.122V8.5a2.25 2.25 0 0 1 2.25-2.25h.75V4.75a2.25 2.25 0 1 1 1.5 0v5.878a2.251 2.251 0 0 1-1.5 2.122Z" />
    </svg>
  );
}

function IssueIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "size-4 text-emerald-400"}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z" />
    </svg>
  );
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "size-3.5"}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}

export function GitHubItemsCard({
  repo,
  items,
  language,
}: GitHubItemsCardProps) {
  const content = chatCopy[language];
  const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;
  const issuesCount = items.filter((item) => !item.isPullRequest).length;
  const prsCount = items.filter((item) => item.isPullRequest).length;

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator pb-2">
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:underline"
        >
          <span>
            {repo.owner}/{repo.repo}
          </span>
          <ExternalIcon />
        </a>
        <div className="flex items-center gap-1.5">
          <Chip color="success" variant="soft" size="sm">
            {issuesCount} {content.githubIssues} · {prsCount}{" "}
            {content.githubPRs}
          </Chip>
        </div>
      </div>

      <p className="text-xs text-muted">{content.githubSource}</p>

      {items.length === 0 ? (
        <p className="py-2 text-xs text-muted">{content.githubNoItems}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.slice(0, 15).map((item) => (
            <article
              key={item.id}
              className="flex items-start gap-2.5 rounded-lg border border-separator/60 bg-surface/50 p-2.5 transition-colors hover:border-separator"
            >
              <div className="mt-0.5 shrink-0">
                {item.isPullRequest ? <PRIcon /> : <IssueIcon />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs font-medium text-foreground transition-colors hover:text-accent hover:underline"
                  >
                    <span className="font-semibold text-muted">
                      #{item.number}
                    </span>{" "}
                    {item.title}
                  </a>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <span>@{item.author}</span>
                  {item.commentsCount > 0 && (
                    <span>💬 {item.commentsCount}</span>
                  )}
                  {item.labels.map((label) => (
                    <span
                      key={label}
                      className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-foreground/80 border border-separator"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="border-t border-separator pt-2 text-right">
        <a
          href={`${repoUrl}/issues`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
        >
          <span>{content.githubViewOnGitHub}</span>
          <ExternalIcon />
        </a>
      </div>
    </div>
  );
}
