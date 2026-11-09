"use client";

import { Focusable, Tooltip } from "@heroui/react";
import type { ReactNode } from "react";
import { PencilGitHubMark, PencilHeart } from "./PencilIcons.tsx";

const AUTHOR = "Tiago Vilas Boas";
const PROFILE_URL = "https://github.com/tiagovilasboas";
const SPONSOR_URL = "https://github.com/sponsors/tiagovilasboas";

interface AuthorCreditProps {
  /** Read after the name for the GitHub mark, e.g. "GitHub profile". */
  profileTitle: string;
  /** Name and tooltip of the heart, e.g. "Sponsor on GitHub Sponsors". */
  sponsorLabel: string;
  className?: string;
}

/** A quiet author credit: the GitHub mark and the Sponsors heart, in pencil. */
export function AuthorCredit({
  profileTitle,
  sponsorLabel,
  className = "",
}: AuthorCreditProps) {
  return (
    <div className={`flex items-center gap-0.5 px-1.5 ${className}`}>
      <CreditLink
        href={PROFILE_URL}
        label={`${AUTHOR}, ${profileTitle}`}
        tooltip={AUTHOR}
      >
        <PencilGitHubMark className="size-[18px]" />
      </CreditLink>
      <CreditLink
        href={SPONSOR_URL}
        label={sponsorLabel}
        tooltip={sponsorLabel}
      >
        <PencilHeart className="size-[18px] transition-transform duration-150 ease-out-expo group-hover:scale-110 group-active:scale-95" />
      </CreditLink>
    </div>
  );
}

interface CreditLinkProps {
  href: string;
  label: string;
  tooltip: string;
  children: ReactNode;
}

function CreditLink({ href, label, tooltip, children }: CreditLinkProps) {
  return (
    <Tooltip delay={300} closeDelay={0}>
      <Focusable>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="group flex size-9 items-center justify-center rounded-xl text-subtle opacity-75 transition-[opacity,background-color,color] duration-150 ease-out-expo hover:bg-surface hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bot-accent"
        >
          {children}
        </a>
      </Focusable>
      <Tooltip.Content
        placement="top"
        offset={8}
        className="px-2.5 py-1.5 text-xs font-medium text-foreground"
      >
        {tooltip}
      </Tooltip.Content>
    </Tooltip>
  );
}
