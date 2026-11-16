import type { BotProfile } from "./bot-types.ts";

/** How long a deleted bot can still be brought back. */
export const UNDO_WINDOW_MS = 8_000;

/**
 * A deletion waiting out its undo window. It lives in memory only: the bot
 * stays in storage until the window ends, so closing the tab mid-window
 * simply reverts the deletion on reload and loses nothing.
 */
export interface PendingDeletion {
  botId: string;
  commitAt: number;
}

export interface ScheduledDeletion {
  pending: PendingDeletion;
  /** A previous pending deletion that must be committed now, one at a time. */
  commitNow: string | null;
}

export function scheduleDeletion(
  current: PendingDeletion | null,
  botId: string,
  now: number,
): ScheduledDeletion {
  return {
    pending: { botId, commitAt: now + UNDO_WINDOW_MS },
    commitNow: current && current.botId !== botId ? current.botId : null,
  };
}

/** Milliseconds left to undo, never negative. */
export function undoTimeLeft(pending: PendingDeletion, now: number): number {
  return Math.max(0, pending.commitAt - now);
}

export function isDeletionDue(pending: PendingDeletion, now: number): boolean {
  return undoTimeLeft(pending, now) === 0;
}

/** The list as shown: the bot waiting to be deleted is already gone. */
export function withoutPendingDeletion(
  bots: readonly BotProfile[],
  pending: PendingDeletion | null,
): BotProfile[] {
  return pending ? bots.filter((bot) => bot.id !== pending.botId) : [...bots];
}
