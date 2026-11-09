"use client";

import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { useCopyToClipboard } from "./use-copy-to-clipboard.ts";

interface CopyButtonProps {
  text: string;
  language: ChatLanguage;
  kind: "message" | "code";
  className?: string;
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 text-success"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CopyButton({
  text,
  language,
  kind,
  className = "",
}: CopyButtonProps) {
  const content = chatCopy[language];
  const { copied, copy, canCopy } = useCopyToClipboard(text);
  const label = kind === "message" ? content.copyMessage : content.copyCode;

  if (!canCopy) return null;

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? content.copied : label}
      title={copied ? content.copied : label}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium text-subtle transition-[color,background-color,transform] duration-140 ease-out-expo hover:bg-surface hover:text-foreground active:scale-[0.97] ${className}`}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite" className={copied ? "text-success" : "sr-only"}>
        {copied ? content.copied : ""}
      </span>
    </button>
  );
}
