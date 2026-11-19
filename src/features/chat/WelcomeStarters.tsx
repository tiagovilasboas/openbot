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
      className={`flex snap-x scroll-px-3 gap-2 overflow-x-auto px-3 [scrollbar-width:none] md:flex-wrap md:justify-center md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {tasks.map((task) => (
        <button
          key={task}
          type="button"
          onClick={() => onPick(task)}
          title={task}
          className="min-h-10 w-max max-w-[70vw] shrink-0 snap-start rounded-2xl border border-border bg-surface px-3.5 py-2 text-left text-sm leading-5 font-medium text-foreground transition-[background-color,transform] duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary active:scale-[0.97] md:min-h-11 md:w-auto md:max-w-60 md:shrink md:px-4"
        >
          {/* Phone: two lines at most, so the row stays one chip tall. */}
          <span className="line-clamp-2 md:line-clamp-none">{task}</span>
        </button>
      ))}
    </div>
  );
}
