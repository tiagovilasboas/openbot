"use client";

import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface ChatComposerProps {
  language: ChatLanguage;
  draft: string;
  busy: boolean;
  mode?: "hero" | "docked";
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "size-4"}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function ChatComposer({
  language,
  draft,
  busy,
  mode = "docked",
  onDraftChange,
  onSend,
}: ChatComposerProps) {
  const content = chatCopy[language];
  const isHero = mode === "hero";
  const canSend = Boolean(draft.trim()) && !busy;

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) {
          onSend();
        }
      }}
    >
      <div
        className={`group relative flex flex-col w-full rounded-2xl sm:rounded-3xl border border-white/12 bg-zinc-900/90 shadow-2xl shadow-black/80 backdrop-blur-xl transition-all duration-200 focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20 ${
          isHero ? "p-3 sm:p-4 min-h-[96px]" : "p-2 sm:p-2.5 min-h-[52px]"
        }`}
      >
        <textarea
          aria-label={content.composerLabel}
          className={`w-full flex-1 resize-none border-0 bg-transparent text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-0 leading-relaxed ${
            isHero
              ? "min-h-[56px] text-base sm:text-lg"
              : "min-h-[38px] text-sm sm:text-base"
          }`}
          placeholder={content.placeholder}
          value={draft}
          rows={isHero ? 2 : 1}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSend) {
                onSend();
              }
            }
          }}
        />

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-zinc-500 select-none pl-1 hidden sm:block">
            {content.composerHint}
          </p>
          <div className="sm:hidden" />

          <button
            type="submit"
            disabled={!canSend}
            aria-label={content.sendMessageLabel}
            className={`flex items-center justify-center rounded-full bg-white text-black font-semibold transition-all duration-150 active:scale-95 disabled:opacity-20 disabled:pointer-events-none ${
              isHero ? "size-9 sm:size-10" : "size-8 sm:size-9"
            }`}
          >
            <ArrowUpIcon className={isHero ? "size-4 sm:size-5" : "size-4"} />
          </button>
        </div>
      </div>
    </form>
  );
}
