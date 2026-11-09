"use client";

import { chatCopy } from "./chat-copy.ts";
import { CopyButton } from "./CopyButton.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

interface CodeBlockProps {
  code: string;
  lang: string;
  language: ChatLanguage;
}

export function CodeBlock({ code, lang, language }: CodeBlockProps) {
  return (
    <figure className="my-3 overflow-hidden rounded-xl border border-border bg-surface">
      <figcaption className="flex min-h-11 items-center justify-between border-b border-separator pl-4 pr-1">
        <span className="font-mono text-xs font-medium text-subtle">
          {lang || chatCopy[language].codeLabel}
        </span>
        <CopyButton text={code} language={language} kind="code" />
      </figcaption>
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-relaxed text-foreground">
        <code className="font-mono">{code}</code>
      </pre>
    </figure>
  );
}
