"use client";

import { FORMAT_LOCALE } from "../language/language.ts";
import { chatCopy } from "@/features/chat/chat-copy";
import type { ChatLanguage } from "@/features/chat/respond-to-message";
import { safeGithubUrl } from "./safe-github-url.ts";
import type { GitHubItem, GitHubRepoRef } from "./github-types.ts";

interface GitHubItemsCardProps {
  repo: GitHubRepoRef;
  items: GitHubItem[];
  language: ChatLanguage;
}

const SVG_PROPS = {
  "aria-hidden": true,
  className: "size-4 shrink-0",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

function PRIcon() {
  return (
    <svg {...SVG_PROPS} className="size-4 shrink-0 text-bot-accent">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5v7M18 15.5V10a3 3 0 0 0-3-3h-3m2-2.5L12 7l2 2.5" />
    </svg>
  );
}

function IssueIcon() {
  return (
    <svg {...SVG_PROPS} className="size-4 shrink-0 text-success">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg {...SVG_PROPS} className="size-3.5 shrink-0">
      <path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </svg>
  );
}

function formatDate(iso: string, language: ChatLanguage): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(FORMAT_LOCALE[language], {
    day: "numeric",
    month: "short",
  }).format(date);
}

function ItemRow({
  item,
  language,
}: {
  item: GitHubItem;
  language: ChatLanguage;
}) {
  const content = chatCopy[language];
  const date = formatDate(item.createdAt, language);
  const kind = item.isPullRequest
    ? content.githubItemPR
    : content.githubItemIssue;

  const href = safeGithubUrl(item.url);
  const body = (
    <>
      <span className="mt-0.5" title={kind}>
        {item.isPullRequest ? <PRIcon /> : <IssueIcon />}
        <span className="sr-only">{kind}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground">
          {item.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
          <span className="tabular-nums">#{item.number}</span>
          <span>@{item.author}</span>
          {date && <span className="tabular-nums">{date}</span>}
          {item.commentsCount > 0 && (
            <span className="tabular-nums">
              {item.commentsCount} {content.githubComments}
            </span>
          )}
        </span>
        {item.labels.length > 0 && (
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {item.labels.slice(0, 4).map((label) => (
              <span
                key={label}
                className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-muted"
              >
                {label}
              </span>
            ))}
          </span>
        )}
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-14 items-start gap-3 px-4 py-3 transition-colors duration-140 hover:bg-surface-secondary active:bg-surface-tertiary"
        >
          {body}
        </a>
      ) : (
        <div className="flex min-h-14 items-start gap-3 px-4 py-3">{body}</div>
      )}
    </li>
  );
}

export function GitHubItemsCard({
  repo,
  items,
  language,
}: GitHubItemsCardProps) {
  const content = chatCopy[language];
  const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-separator px-4">
        <a
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 items-center gap-1.5 text-[15px] font-medium text-foreground hover:text-bot-accent"
        >
          <span className="truncate">
            {repo.owner}/{repo.repo}
          </span>
          <ExternalIcon />
        </a>
        <span className="shrink-0 text-xs font-medium tabular-nums text-subtle">
          {items.length} {content.githubOpenItems}
        </span>
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-4 text-[13px] text-muted">
          {content.githubNoItems}
        </p>
      ) : (
        <ul className="divide-y divide-separator">
          {items.slice(0, 15).map((item) => (
            <ItemRow key={item.id} item={item} language={language} />
          ))}
        </ul>
      )}

      <footer className="flex items-center justify-between gap-3 border-t border-separator px-4">
        <span className="py-2 text-xs text-subtle">{content.githubSource}</span>
        <a
          href={`${repoUrl}/issues`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground"
        >
          {content.githubViewOnGitHub}
          <ExternalIcon />
        </a>
      </footer>
    </section>
  );
}
