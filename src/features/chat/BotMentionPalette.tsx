"use client";

import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { chatCopy } from "./chat-copy.ts";
import { ComposerPalette } from "./ComposerPalette.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

interface BotMentionPaletteProps {
  id: string;
  language: ChatLanguage;
  /** Bots already filtered by the typed `@query`. */
  bots: BotProfile[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (bot: BotProfile) => void;
}

export function BotMentionPalette({
  id,
  language,
  bots,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: BotMentionPaletteProps) {
  const content = chatCopy[language];

  return (
    <ComposerPalette
      id={id}
      label={content.mentionPaletteLabel}
      activeIndex={activeIndex}
      emptyTitle={content.mentionPaletteEmpty}
      emptyHint={content.mentionPaletteEmptyHint}
      onActiveIndexChange={onActiveIndexChange}
      onSelect={(index) => {
        const bot = bots[index];
        if (bot) onSelect(bot);
      }}
      rows={bots.map((bot) => ({
        key: bot.id,
        leading: (
          <BotAvatar
            shape={bot.avatarShape}
            color={bot.avatarColor}
            size={34}
          />
        ),
        title: bot.name,
        description: bot.title || bot.description,
      }))}
    />
  );
}
