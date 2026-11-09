"use client";

import type { ComponentType } from "react";
import { chatCopy } from "./chat-copy.ts";
import {
  HelpIcon,
  IssueIcon,
  PullRequestIcon,
  SunIcon,
} from "./ComposerIcons.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

type CopyKey = keyof (typeof chatCopy)[ChatLanguage];

interface Suggestion {
  key: string;
  Icon: ComponentType<{ className?: string }>;
  label: CopyKey;
  prompt: CopyKey;
}

const SUGGESTIONS: readonly Suggestion[] = [
  {
    key: "briefing",
    Icon: SunIcon,
    label: "summarySamplePrompt",
    prompt: "summarySampleQuery",
  },
  {
    key: "issues",
    Icon: IssueIcon,
    label: "gitHubSamplePrompt",
    prompt: "gitHubIssuesQuery",
  },
  {
    key: "pulls",
    Icon: PullRequestIcon,
    label: "prompt",
    prompt: "gitHubPullsQuery",
  },
  { key: "how", Icon: HelpIcon, label: "sample", prompt: "sample" },
];

interface SuggestionChipsProps {
  language: ChatLanguage;
  /** Hidden while a draft exists: a tap would send the chip and drop it. */
  isHidden?: boolean;
  className?: string;
  onSelectPrompt: (prompt: string) => void;
}

/**
 * Starter prompts. Phone: one row that scrolls sideways, edge-aligned with
 * the composer. Desktop: centered and wrapping.
 */
export function SuggestionChips({
  language,
  isHidden = false,
  className = "",
  onSelectPrompt,
}: SuggestionChipsProps) {
  const content = chatCopy[language];

  return (
    <div
      role="group"
      aria-label={content.suggestionsLabel}
      inert={isHidden}
      className={`flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 transition-opacity duration-(--duration-ui) ease-out-expo [scrollbar-width:none] md:flex-wrap md:justify-center md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden ${
        isHidden ? "opacity-0" : ""
      } ${className}`}
    >
      {SUGGESTIONS.map(({ key, Icon, label, prompt }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelectPrompt(content[prompt])}
          className="inline-flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface px-4 text-[15px] font-medium text-foreground transition-[background-color,transform] duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary active:scale-[0.97] md:text-sm"
        >
          <Icon className="size-4 shrink-0 text-muted" />
          {content[label]}
        </button>
      ))}
    </div>
  );
}
