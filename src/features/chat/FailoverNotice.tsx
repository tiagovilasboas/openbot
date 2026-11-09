"use client";

import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface FailoverNoticeProps {
  language: ChatLanguage;
  fromModel: string;
  toModel: string;
  reason: string;
}

export function FailoverNotice({
  language,
  fromModel,
  toModel,
  reason,
}: FailoverNoticeProps) {
  const content = chatCopy[language];
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-3 py-2 text-[13px] leading-snug">
      <svg
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-warning"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3l-7.9-13.6a2 2 0 0 0-3.4 0Z" />
      </svg>
      <p className="min-w-0 break-words text-foreground">
        <span className="font-medium">{content.failoverNotice}</span>
        <span className="text-muted">
          {" "}
          <span className="font-mono text-xs">{fromModel}</span>
          {" > "}
          <span className="font-mono text-xs">{toModel}</span>
          {reason ? ` (${content.failoverReasonLabel}: ${reason})` : ""}
        </span>
      </p>
    </div>
  );
}
