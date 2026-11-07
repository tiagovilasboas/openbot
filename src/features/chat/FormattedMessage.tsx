"use client";

import React from "react";
import { parseBlocks, parseInlineTokens } from "./parse-markdown-blocks.ts";

interface FormattedMessageProps {
  content: string;
  className?: string;
}

function renderInline(text: string): React.ReactNode[] {
  const tokens = parseInlineTokens(text);
  return tokens.map((token, index) => {
    switch (token.type) {
      case "bold":
        return (
          <strong key={index} className="font-semibold text-white">
            {token.text}
          </strong>
        );
      case "code":
        return (
          <code
            key={index}
            className="rounded border border-white/10 bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-200"
          >
            {token.text}
          </code>
        );
      case "italic":
        return (
          <em key={index} className="italic text-zinc-400">
            {token.text}
          </em>
        );
      case "text":
        return token.text;
    }
  });
}

export function FormattedMessage({
  content,
  className,
}: FormattedMessageProps) {
  const blocks = parseBlocks(content);

  return (
    <div
      className={`space-y-2 text-sm sm:text-base leading-relaxed ${className ?? ""}`}
    >
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h3":
            return (
              <h3
                key={i}
                className="text-base sm:text-lg font-semibold text-white tracking-tight pt-2 first:pt-0"
              >
                {renderInline(block.text)}
              </h3>
            );
          case "h4":
            return (
              <h4
                key={i}
                className="text-xs sm:text-sm font-semibold text-zinc-300 uppercase tracking-wider pt-2 first:pt-0"
              >
                {renderInline(block.text)}
              </h4>
            );
          case "quote": {
            const isWarning =
              block.text.includes("⚠️") ||
              block.text.toLowerCase().includes("falha") ||
              block.text.toLowerCase().includes("failure");
            return (
              <blockquote
                key={i}
                className={`my-2 rounded-xl border p-3 text-xs sm:text-sm ${
                  isWarning
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    : "border-white/10 bg-zinc-900/60 text-zinc-300"
                }`}
              >
                {renderInline(block.text)}
              </blockquote>
            );
          }
          case "list":
            return (
              <ul
                key={i}
                className="my-1.5 space-y-1 pl-4 list-disc marker:text-zinc-500 text-zinc-300"
              >
                {block.items.map((item, j) => (
                  <li key={j} className="leading-relaxed">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            );
          case "paragraph":
            return (
              <p key={i} className="text-zinc-200 leading-relaxed">
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
