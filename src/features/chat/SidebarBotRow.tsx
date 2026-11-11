"use client";

import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { AttentionBadge } from "@/features/attention/AttentionBadge.tsx";
import { attentionLabel } from "@/features/attention/attention-copy.ts";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { BotWorkingDot } from "./BotWorkingDot.tsx";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { EditIcon, GripIcon } from "./ShellIcons.tsx";

/** What a row needs to be moved: absent for the main bot, which stays put. */
export interface RowReorder {
  hintId: string;
  isDragging: boolean;
  registerHandle: (el: HTMLElement | null) => void;
  onHandlePointerDown: (event: ReactPointerEvent) => void;
  onHandleKeyDown: (event: ReactKeyboardEvent) => void;
}

interface SidebarBotRowProps {
  language: ChatLanguage;
  bot: BotProfile;
  role?: string;
  isActive: boolean;
  isWorking: boolean;
  /** Replies the user has not seen yet. */
  unseenReplies?: number;
  reorder?: RowReorder;
  rowRef: (el: HTMLElement | null) => void;
  onSelect: () => void;
  onEdit: () => void;
}

const ROW_BUTTON =
  "flex min-h-14 w-full items-center gap-3 rounded-xl py-2 pl-3 text-left transition-[background-color,transform] duration-150 ease-out-expo active:scale-[0.98]";
const SIDE_BUTTON =
  "absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full text-subtle transition-[opacity,background-color,color,scale] duration-150 ease-out-expo hover:bg-surface-secondary hover:text-foreground active:scale-[0.97] pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100";

/** One bot of the sidebar: select, working dot, move handle and edit. */
export function SidebarBotRow({
  language,
  bot,
  role,
  isActive,
  isWorking,
  unseenReplies = 0,
  reorder,
  rowRef,
  onSelect,
  onEdit,
}: SidebarBotRowProps) {
  const content = chatCopy[language];

  return (
    <li
      ref={rowRef}
      className={`group relative rounded-xl ${
        reorder?.isDragging
          ? "z-10 bg-surface shadow-lg ring-1 ring-border"
          : ""
      }`}
    >
      <button
        type="button"
        aria-current={isActive ? "page" : undefined}
        onClick={onSelect}
        className={`${ROW_BUTTON} ${reorder ? "pr-[5.5rem]" : "pr-12"} ${
          isActive ? "bg-surface-tertiary" : "hover:bg-surface"
        }`}
      >
        <span className="relative shrink-0">
          <BotAvatar
            shape={bot.avatarShape}
            color={bot.avatarColor}
            size={38}
            active={isActive}
          />
          {isWorking && <BotWorkingDot color={bot.avatarColor} />}
          {unseenReplies > 0 && <AttentionBadge count={unseenReplies} />}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] leading-5 font-medium text-foreground md:text-sm">
            {bot.name}
          </span>
          {role && (
            <span className="truncate text-[13px] leading-[18px] text-muted">
              {role}
            </span>
          )}
        </span>
        {isWorking && <span className="sr-only">, {content.botWorking}</span>}
        {unseenReplies > 0 && (
          <span className="sr-only">
            , {attentionLabel(language, unseenReplies)}
          </span>
        )}
      </button>

      {reorder && (
        <button
          type="button"
          ref={(el) => reorder.registerHandle(el)}
          aria-label={`${content.reorderBotAria} ${bot.name}`}
          aria-describedby={reorder.hintId}
          aria-keyshortcuts="ArrowUp ArrowDown"
          onPointerDown={reorder.onHandlePointerDown}
          onKeyDown={reorder.onHandleKeyDown}
          className={`${SIDE_BUTTON} right-11 size-9 touch-none select-none ${
            reorder.isDragging
              ? "cursor-grabbing pointer-fine:opacity-100"
              : "cursor-grab"
          }`}
        >
          <GripIcon className="size-4" />
        </button>
      )}

      <button
        type="button"
        aria-label={`${content.editBotAria} ${bot.name}`}
        onClick={onEdit}
        className={`${SIDE_BUTTON} right-1 size-11`}
      >
        <EditIcon className="size-4" />
      </button>
    </li>
  );
}
