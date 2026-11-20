"use client";

import { botStarters } from "@/features/bots/bot-starters.ts";
import { getStartersCopy } from "@/features/bots/bot-starters-copy.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface WelcomeStartersProps {
  language: ChatLanguage;
  bot: BotProfile;
  className?: string;
  /** Fills the composer with the task; the user still sends it. */
  onPick: (task: string) => void;
}

/**
 * Three short starter chips drawn from the bot's profile, no model involved.
 * One row, one line each; the full task goes to the composer.
 */
export function WelcomeStarters({
  language,
  bot,
  className = "",
  onPick,
}: WelcomeStartersProps) {
  const tasks = botStarters(bot, language);

  return (
    <div
      role="group"
      aria-label={getStartersCopy(language).groupLabel}
      className={`flex snap-x scroll-px-3 gap-2 overflow-x-auto px-3 [scrollbar-width:none] md:justify-center md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {tasks.map((starter) => (
        <button
          key={starter.task}
          type="button"
          onClick={() => onPick(starter.task)}
          title={starter.task}
          className="min-h-9 w-max shrink-0 snap-start whitespace-nowrap rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium text-foreground transition-[background-color,transform] duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary active:scale-[0.97] md:min-h-10"
        >
          {starter.label}
        </button>
      ))}
    </div>
  );
}
