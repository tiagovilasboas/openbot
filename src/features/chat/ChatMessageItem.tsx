"use client";

import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { GitHubItemsCard } from "@/features/github/GitHubItemsCard.tsx";
import type {
  GitHubItem,
  GitHubRepoRef,
} from "@/features/github/github-types.ts";
import { chatCopy } from "./chat-copy.ts";
import { FormattedMessage } from "./FormattedMessage.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

export interface MessageData {
  id: number;
  language: ChatLanguage;
  role: "assistant" | "user";
  text: string;
  delegatedBot?: BotProfile;
  github?: {
    repo: GitHubRepoRef;
    items: GitHubItem[];
  };
  modelBadge?: string;
  failover?: {
    fromModel: string;
    toModel: string;
    reason: string;
  };
}

interface ChatMessageItemProps {
  message: MessageData;
  activeBot?: BotProfile;
  onOpenSettings?: () => void;
}

export function ChatMessageItem({
  message,
  activeBot,
  onOpenSettings,
}: ChatMessageItemProps) {
  if (message.role === "user") {
    return (
      <article className="flex w-full justify-end animate-in fade-in slide-in-from-bottom-2 duration-150">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-sm bg-zinc-800 text-zinc-100 px-4 py-2.5 text-sm sm:text-base leading-relaxed shadow-sm">
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        </div>
      </article>
    );
  }

  const displayingBot = message.delegatedBot || activeBot;

  return (
    <article className="flex w-full items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
      {displayingBot ? (
        <div className="mt-0.5 shrink-0">
          <BotAvatar
            shape={displayingBot.avatarShape}
            color={displayingBot.avatarColor}
            size={28}
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 font-mono text-xs font-semibold shadow-sm mt-0.5 select-none"
        >
          &gt;_
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <span>{displayingBot?.name || chatCopy[message.language].title}</span>
          {displayingBot && (
            <span className="text-[11px] text-zinc-500">
              ·{" "}
              {displayingBot.id === "chief-of-staff" ||
              displayingBot.id === "default"
                ? message.language === "pt"
                  ? "Manager & Orquestrador"
                  : "Manager & Orchestrator"
                : displayingBot.title}
            </span>
          )}
          {message.delegatedBot && (
            <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded-md">
              via @{message.delegatedBot.name}
            </span>
          )}
        </div>

        <FormattedMessage content={message.text} />

        {message.github && (
          <div className="mt-2 w-full">
            <GitHubItemsCard
              repo={message.github.repo}
              items={message.github.items}
              language={message.language}
            />
          </div>
        )}

        {message.failover && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded-md">
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>
              {message.language === "pt"
                ? `Failover automático: ${message.failover.fromModel} → ${message.failover.toModel}`
                : `Automatic failover: ${message.failover.fromModel} → ${message.failover.toModel}`}
            </span>
          </div>
        )}

        {message.modelBadge && (
          <div className="mt-1.5 flex items-center gap-1.5 pt-1 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-zinc-900/90 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              {message.modelBadge}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
