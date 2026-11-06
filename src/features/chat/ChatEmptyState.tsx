"use client";

import { chatCopy } from "./chat-copy.ts";
import { ChatComposer } from "./ChatComposer.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

interface ChatEmptyStateProps {
  language: ChatLanguage;
  draft: string;
  busy: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onSelectPrompt: (prompt: string) => void;
}

export function ChatEmptyState({
  language,
  draft,
  busy,
  onDraftChange,
  onSend,
  onSelectPrompt,
}: ChatEmptyStateProps) {
  const content = chatCopy[language];

  return (
    <section className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-16 w-full max-w-2xl mx-auto my-auto animate-in fade-in duration-300">
      {/* Minimalist Logo & Greeting */}
      <div className="mb-6 sm:mb-8 flex flex-col items-center text-center gap-2.5">
        <div
          aria-hidden="true"
          className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 shadow-xl shadow-black/80 text-white font-mono text-lg font-bold transition-transform hover:scale-105"
        >
          &gt;_
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          {content.emptyHeading}
        </h2>
        <p className="max-w-md text-xs sm:text-sm text-zinc-400">
          {content.emptySubheading}
        </p>
      </div>

      {/* Centralized Hero Composer */}
      <div className="w-full mb-4 sm:mb-5">
        <ChatComposer
          mode="hero"
          language={language}
          draft={draft}
          busy={busy}
          onDraftChange={onDraftChange}
          onSend={onSend}
        />
      </div>

      {/* Quick Suggestion Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() =>
            onSelectPrompt(
              language === "pt"
                ? "issues de tiagovilasboas/openbot"
                : "issues of tiagovilasboas/openbot",
            )
          }
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-3.5 py-1.5 text-xs text-zinc-300 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-zinc-800 hover:text-white active:scale-95"
        >
          <span className="font-mono text-emerald-400 text-[11px] font-semibold">
            &lt;/&gt;
          </span>
          <span>{content.gitHubSamplePrompt}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectPrompt(content.prompt)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-3.5 py-1.5 text-xs text-zinc-300 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-zinc-800 hover:text-white active:scale-95"
        >
          <span className="text-amber-400">📅</span>
          <span>{content.prompt}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectPrompt(content.sample)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-3.5 py-1.5 text-xs text-zinc-300 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-zinc-800 hover:text-white active:scale-95"
        >
          <span className="text-sky-400 text-xs">✦</span>
          <span>{content.sample}</span>
        </button>
      </div>
    </section>
  );
}
