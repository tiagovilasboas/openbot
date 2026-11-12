"use client";

import { useEffect, useState } from "react";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { toolsCopy } from "@/features/tools/client/tools-copy.ts";
import { activityPhase, elapsedSeconds } from "./activity-phase.ts";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface ThinkingIndicatorProps {
  /** The bot working now; a crew member while it answers the Chief. */
  bot: BotProfile;
  /** The bot that took the message. */
  turnBot: BotProfile;
  language: ChatLanguage;
  /** Reply text has started to arrive. */
  hasStreamedText: boolean;
  /** A tool call of the turn is running now. */
  usingTool?: boolean;
  /** Stops the reply in flight. */
  onCancel: () => void;
}

/** One status line for the turn in flight: who, what phase, how long. */
export function ThinkingIndicator({
  bot,
  turnBot,
  language,
  hasStreamedText,
  usingTool = false,
  onCancel,
}: ThinkingIndicatorProps) {
  const content = chatCopy[language];
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const phase = activityPhase({
    delegating: bot.id !== turnBot.id,
    hasStreamedText,
    usingTool,
  });
  const phrase =
    phase === "consulting"
      ? `${content.activityConsulting} ${bot.name}…`
      : phase === "tool"
        ? toolsCopy[language].activityTool
        : phase === "writing"
          ? content.activityWriting
          : content.activityThinking;

  return (
    <div className="flex items-center gap-2.5 animate-enter">
      <BotAvatar shape={bot.avatarShape} color={bot.avatarColor} size={29} />
      <p className="flex items-baseline gap-2 text-[14px] text-muted">
        <span role="status" aria-live="polite" className="activity-shimmer">
          {phrase}
        </span>
        <span aria-hidden="true" className="tabular-nums">
          {elapsedSeconds(startedAt, now)}s
        </span>
      </p>
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
