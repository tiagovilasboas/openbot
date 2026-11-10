"use client";

import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface ThinkingIndicatorProps {
  bot: BotProfile;
  language: ChatLanguage;
  /** Stops the reply in flight. */
  onCancel: () => void;
}

const DOT_DELAYS = ["0ms", "150ms", "300ms"];

export function ThinkingIndicator({
  bot,
  language,
  onCancel,
}: ThinkingIndicatorProps) {
  const content = chatCopy[language];
  return (
    <div className="flex items-center gap-2.5 animate-enter" role="status">
      <BotAvatar shape={bot.avatarShape} color={bot.avatarColor} size={29} />
      <div aria-hidden="true" className="flex items-center gap-1.5">
        {DOT_DELAYS.map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-muted animate-typing"
            style={{ animationDelay: delay }}
          />
        ))}
      </div>
      <span aria-live="polite" className="sr-only">
        {content.thinking}
      </span>
      <button
        type="button"
        aria-label={content.cancelLabel}
        onClick={onCancel}
        className="ml-1 flex min-h-11 items-center rounded-full px-3 text-[13px] font-medium text-muted transition-[background-color,color] duration-(--duration-micro) ease-out-expo hover:bg-surface hover:text-foreground"
      >
        {content.cancelLabel}
      </button>
    </div>
  );
}
