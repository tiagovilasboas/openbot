"use client";

import { useState } from "react";
import type { BotProfile } from "../bots/bot-types.ts";
import { visibleBots } from "../bots/bot-visibility.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { displayTitle, getThreadCopy } from "../threads/thread-copy.ts";
import { selectedThreadId } from "../threads/thread-selection.ts";
import { loadThreads } from "../threads/thread-storage.ts";
import { ResponsiveSheet } from "@/shared/ui/ResponsiveSheet.tsx";
import { ageBucket, buildTaskRows } from "./task-rows.ts";
import { ageLabel, getTasksCopy } from "./tasks-copy.ts";

interface TasksPanelProps {
  language: ChatLanguage;
  bots: readonly BotProfile[];
  workingBotIds: readonly string[];
  /** Switch to the bot and thread the row names. */
  onOpenThread: (botId: string, threadId: string) => void;
}

function TaskList({
  language,
  bots,
  workingBotIds,
  onPick,
}: Omit<TasksPanelProps, "onOpenThread"> & {
  onPick: (botId: string, threadId: string) => void;
}) {
  const [now] = useState(() => Date.now());
  const copy = getTasksCopy(language);
  const threadCopy = getThreadCopy(language);
  const rows = buildTaskRows(
    visibleBots(bots).map((bot) => ({
      bot,
      threads: loadThreads(bot.id),
      selectedThreadId: selectedThreadId(bot.id),
    })),
    workingBotIds,
  );
  if (rows.length === 0) {
    return <p className="text-[13px] text-subtle">{copy.empty}</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((row) => (
        <li key={row.key}>
          <button
            type="button"
            onClick={() => onPick(row.botId, row.thread.id)}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {displayTitle(row.thread, threadCopy)}
              </span>
              <span className="block truncate text-[12px] text-muted">
                {row.botName}
              </span>
            </span>
            <span className="shrink-0 text-[12px] text-subtle">
              {row.running
                ? copy.running
                : ageLabel(copy, ageBucket(row.thread.updatedAt, now))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** A button that opens every bot's threads in one list. */
export function TasksPanel({
  language,
  bots,
  workingBotIds,
  onOpenThread,
}: TasksPanelProps) {
  const copy = getTasksCopy(language);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-[13px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        {copy.open}
      </button>
      <ResponsiveSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={copy.title}
        description={copy.description}
        size="md"
        closeLabel={copy.close}
      >
        <TaskList
          language={language}
          bots={bots}
          workingBotIds={workingBotIds}
          onPick={(botId, threadId) => {
            setIsOpen(false);
            onOpenThread(botId, threadId);
          }}
        />
      </ResponsiveSheet>
    </>
  );
}
