"use client";

import { useId } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { SidebarBotRow } from "./SidebarBotRow.tsx";
import { useBotReorder } from "./use-bot-reorder.ts";

interface SidebarBotListProps {
  language: ChatLanguage;
  bots: BotProfile[];
  activeBotId: string;
  /** The bot leading the crew; it shows the Chief of Staff role. */
  mainBotId?: string;
  /** Bots answering a message right now. */
  workingBotIds?: readonly string[];
  onSelectBot: (botId: string) => void;
  onEditBot: (bot: BotProfile) => void;
  /** Moves a bot to a position of the list as shown; omit to lock the order. */
  onReorderBot?: (botId: string, toIndex: number) => void;
}

export function SidebarBotList({
  language,
  bots,
  activeBotId,
  mainBotId,
  workingBotIds = [],
  onSelectBot,
  onEditBot,
  onReorderBot,
}: SidebarBotListProps) {
  const content = chatCopy[language];
  const hintId = useId();
  const reorder = useBotReorder({
    bots,
    mainBotId,
    onReorder: (id, to) => onReorderBot?.(id, to),
    movedTemplate: content.reorderMoved,
  });
  const canReorder = Boolean(onReorderBot) && bots.length > 2;

  return (
    <>
      <ul className="flex flex-col gap-0.5">
        {reorder.order.map((bot) => {
          const movable = canReorder && bot.id !== mainBotId;
          return (
            <SidebarBotRow
              key={bot.id}
              language={language}
              bot={bot}
              role={
                bot.id === mainBotId ? content.chiefOfStaffTitle : bot.title
              }
              isActive={bot.id === activeBotId}
              isWorking={workingBotIds.includes(bot.id)}
              rowRef={reorder.registerRow(bot.id)}
              onSelect={() => onSelectBot(bot.id)}
              onEdit={() => onEditBot(bot)}
              reorder={
                movable
                  ? {
                      hintId,
                      isDragging: reorder.draggingId === bot.id,
                      registerHandle: reorder.registerHandle(bot.id),
                      onHandlePointerDown: (e) => reorder.startDrag(e, bot.id),
                      onHandleKeyDown: (e) => reorder.moveByKey(e, bot.id),
                    }
                  : undefined
              }
            />
          );
        })}
      </ul>
      {canReorder && (
        <p id={hintId} className="sr-only">
          {content.reorderHint}
        </p>
      )}
      <div role="status" aria-live="polite" className="sr-only">
        {reorder.status}
      </div>
    </>
  );
}
