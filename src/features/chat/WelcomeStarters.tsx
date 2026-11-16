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

/** Three starter tasks drawn from the bot's profile, no model involved. */
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
      className={`flex flex-col gap-2 px-4 md:flex-row md:flex-wrap md:justify-center md:px-0 ${className}`}
    >
      {tasks.map((task) => (
        <button
          key={task}
          type="button"
          onClick={() => onPick(task)}
          className="min-h-11 rounded-2xl border border-border bg-surface px-4 py-2 text-left text-[15px] font-medium text-foreground transition-[background-color,transform] duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary active:scale-[0.97] md:max-w-60 md:text-sm"
        >
          {task}
        </button>
      ))}
    </div>
  );
}
