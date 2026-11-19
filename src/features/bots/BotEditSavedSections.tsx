"use client";

import { BotTemplateExport } from "@/features/bot-sharing/BotTemplateFileControls.tsx";
import { ChannelsSection } from "@/features/crew/channel/client/ChannelsSection.tsx";
import { getChannelsCopy } from "@/features/crew/channel/client/channels-copy.ts";
import type { Language } from "@/features/language/language.ts";
import { MemorySection } from "@/features/memory/MemorySection.tsx";
import { RoutinesSection } from "@/features/routines/client/RoutinesSection.tsx";
import { getRoutinesCopy } from "@/features/routines/client/routines-copy.ts";
import { BotEditDisclosure } from "./BotEditDisclosure.tsx";
import { BotHideControl } from "./BotHideControl.tsx";
import { BotMainControl } from "./BotMainControl.tsx";
import type { BotProfile } from "./bot-types.ts";
import { getBotEditSectionsCopy } from "./bot-edit-sections-copy.ts";

interface BotEditSavedSectionsProps {
  bot: BotProfile;
  language: Language;
  isMain: boolean;
  canHide: boolean;
  /** Every bot, offered as channel members when this is the main bot. */
  crewBots?: BotProfile[];
  onMakeMain?: (id: string) => void;
  onHide?: (id: string) => void;
  onRestore?: (id: string) => void;
}

/**
 * What only a saved bot has: memory, routines, the crew's channels and the
 * rarely used options. Routines, channels and options start collapsed so
 * the editor stays short on a phone.
 */
export function BotEditSavedSections({
  bot,
  language,
  isMain,
  canHide,
  crewBots,
  onMakeMain,
  onHide,
  onRestore,
}: BotEditSavedSectionsProps) {
  const sections = getBotEditSectionsCopy(language);
  const routines = getRoutinesCopy(language);
  const channels = getChannelsCopy(language);
  const canToggleHidden = onHide && onRestore && (bot.hidden || canHide);

  return (
    <>
      <MemorySection botId={bot.id} language={language} />

      <BotEditDisclosure title={routines.title}>
        <RoutinesSection botId={bot.id} language={language} />
      </BotEditDisclosure>

      {isMain && crewBots && (
        <BotEditDisclosure title={channels.title}>
          <ChannelsSection
            leaderBotId={bot.id}
            bots={crewBots}
            language={language}
          />
        </BotEditDisclosure>
      )}

      <BotEditDisclosure title={sections.moreOptions}>
        {onMakeMain && (
          <BotMainControl
            language={language}
            isMain={isMain}
            onMakeMain={() => onMakeMain(bot.id)}
          />
        )}
        {canToggleHidden && (
          <BotHideControl
            language={language}
            isHidden={bot.hidden === true}
            onHide={() => onHide(bot.id)}
            onRestore={() => onRestore(bot.id)}
          />
        )}
        <BotTemplateExport bot={bot} language={language} />
      </BotEditDisclosure>
    </>
  );
}
