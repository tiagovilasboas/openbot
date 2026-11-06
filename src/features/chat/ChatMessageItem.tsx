"use client";

import type { CalendarEvent } from "@/features/calendar/list-example-events.ts";
import { GitHubItemsCard } from "@/features/github/GitHubItemsCard.tsx";
import type {
  GitHubItem,
  GitHubRepoRef,
} from "@/features/github/github-types.ts";
import { chatCopy } from "./chat-copy.ts";
import { ChatToolResult } from "./ChatToolResult.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

export interface MessageData {
  id: number;
  language: ChatLanguage;
  role: "assistant" | "user";
  text: string;
  events?: CalendarEvent[];
  github?: {
    repo: GitHubRepoRef;
    items: GitHubItem[];
  };
}

interface ChatMessageItemProps {
  message: MessageData;
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  if (message.role === "user") {
    return (
      <article className="flex w-full justify-end animate-in fade-in slide-in-from-bottom-2 duration-150">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-xs bg-zinc-800 text-zinc-100 px-4 py-2.5 text-sm sm:text-base leading-relaxed shadow-sm">
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="flex w-full items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 font-mono text-xs font-semibold shadow-sm mt-0.5 select-none"
      >
        &gt;_
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <span>{chatCopy[message.language].title}</span>
        </div>

        <div className="text-sm sm:text-base text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </div>

        {message.events && (
          <div className="mt-2 w-full">
            <ChatToolResult
              events={message.events}
              language={message.language}
            />
          </div>
        )}

        {message.github && (
          <div className="mt-2 w-full">
            <GitHubItemsCard
              repo={message.github.repo}
              items={message.github.items}
              language={message.language}
            />
          </div>
        )}
      </div>
    </article>
  );
}
