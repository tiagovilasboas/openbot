import type { RoutineSchedule } from "./routine-schedule.ts";

/** Days without the person's interaction before a recurring routine pauses. */
export const IDLE_PAUSE_DAYS = 14;
export const IDLE_PAUSE_MS = IDLE_PAUSE_DAYS * 24 * 60 * 60_000;

// One-shot wake-ups the bot scheduled for itself, and bot-to-bot handoffs.
const EXEMPT_ID_PREFIXES = ["w_", "m_"];

/** Whether an id is a bot's one-shot wake-up or a bot-to-bot handoff. */
export function isOneShotRoutineId(id: string): boolean {
  return EXEMPT_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

/**
 * Whether the scheduler may pause a routine for inactivity: only recurring
 * routines. Wake-ups and handoffs are one-shot work somebody is waiting on.
 */
export function canIdlePause(routine: {
  id: string;
  schedule: RoutineSchedule;
}): boolean {
  if (routine.schedule.kind === "once") return false;
  return !isOneShotRoutineId(routine.id);
}

/**
 * Whether the person has been away long enough. The last interaction is the
 * latest of the bot's last chat activity and the routine's last save (create,
 * edit or resume); null means no chat activity is known.
 */
export function isIdle(
  routineSavedAt: number,
  lastChatAt: number | null,
  now: number,
): boolean {
  const last = Math.max(routineSavedAt, lastChatAt ?? 0);
  return now - last >= IDLE_PAUSE_MS;
}
