"use client";

import React from "react";
import { CodeBlock } from "./CodeBlock.tsx";
import { parseBlocks, parseInlineTokens } from "./parse-markdown-blocks.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface FormattedMessageProps {
  content: string;
  className?: string;
  language?: ChatLanguage;
}

type Segment =
  | { kind: "markdown"; text: string }
  | { kind: "code"; lang: string; code: string };

const FENCE = /```([\w+-]*)[^\S\n]*\n?([\s\S]*?)```/g;

function splitFences(raw: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of raw.matchAll(FENCE)) {
    const start = match.index ?? 0;
    if (start > last) {
      segments.push({ kind: "markdown", text: raw.slice(last, start) });
    }
    segments.push({
      kind: "code",
      lang: match[1],
      code: match[2].replace(/\n$/, ""),
    });
    last = start + match[0].length;
  }
  if (last < raw.length) {
    segments.push({ kind: "markdown", text: raw.slice(last) });
  }
  return segments;
}

function renderInline(text: string): React.ReactNode[] {
  const tokens = parseInlineTokens(text);
  return tokens.map((token, index) => {
    switch (token.type) {
      case "bold":
        return (
          <strong key={index} className="font-semibold text-foreground">
            {token.text}
          </strong>
        );
      case "code":
        return (
          <code
            key={index}
            className="rounded-md bg-surface-secondary px-1.5 py-0.5 font-mono text-[0.88em] break-words"
          >
            {token.text}
          </code>
        );
      case "italic":
        return (
          <em key={index} className="italic">
            {token.text}
          </em>
        );
      case "text":
        return token.text;
    }
  });
}

function MarkdownBlocks({ text }: { text: string }) {
  return parseBlocks(text).map((block, i) => {
    switch (block.type) {
      case "h3":
        return (
          <h3
            key={i}
            className="mt-5 text-balance text-base font-semibold text-foreground first:mt-0"
          >
            {renderInline(block.text)}
          </h3>
        );
      case "h4":
        return (
          <h4
            key={i}
            className="mt-4 text-balance text-[15px] font-semibold text-foreground first:mt-0"
          >
            {renderInline(block.text)}
          </h4>
        );
      case "quote": {
        const lower = block.text.toLowerCase();
        const isWarning =
          block.text.includes("⚠️") ||
          lower.includes("falha") ||
          lower.includes("failure");
        return (
          <blockquote
            key={i}
            className={
              isWarning
                ? "my-3 rounded-xl bg-warning-soft px-3 py-2 text-[13px] text-foreground"
                : "my-3 border-l border-border pl-4 text-muted"
            }
          >
            {renderInline(block.text)}
          </blockquote>
        );
      }
      case "list":
        return (
          <ul
            key={i}
            className="my-3 list-disc space-y-1.5 pl-5 marker:text-subtle first:mt-0"
          >
            {block.items.map((item, j) => (
              <li key={j} className="pl-1">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
      case "paragraph":
        return (
          <p key={i} className="my-3 first:mt-0 break-words">
            {renderInline(block.text)}
          </p>
        );
    }
  });
}

export function FormattedMessage({
  content,
  className,
  language = "pt",
}: FormattedMessageProps) {
  return (
    <div
      className={`min-w-0 text-base leading-[1.65] text-foreground md:text-[15px] md:leading-[1.7] [&_a]:text-bot-accent [&_a]:underline [&_a]:underline-offset-3 [&_a]:decoration-1 ${className ?? ""}`}
    >
      {splitFences(content).map((segment, i) =>
        segment.kind === "code" ? (
          <CodeBlock
            key={i}
            code={segment.code}
            lang={segment.lang}
            language={language}
          />
        ) : (
          <MarkdownBlocks key={i} text={segment.text} />
        ),
      )}
    </div>
  );
}
