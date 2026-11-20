import type { DatabaseSync } from "node:sqlite";
import type { ToolDefinition } from "../../tools/tool-definition.ts";
import { makesCycle } from "../routine-chain.ts";
import { isRoutineId, MAX_PROMPT_LENGTH } from "../routine-input.ts";
import {
  MAX_INTERVAL_MINUTES,
  MAX_ONCE_AHEAD_MS,
  MIN_INTERVAL_MINUTES,
} from "../routine-schedule.ts";
import {
  getRoutine,
  listRoutines,
  saveRoutine,
} from "./routines-repository.ts";

export const SCHEDULE_WAKEUP = "schedule_wakeup";
/** Waits a bot may keep pending at once. */
export const MAX_PENDING_WAKEUPS = 20;
const TITLE_MAX = 60;

type Args = { note: string; inMinutes?: number; afterRoutineId?: string };

export function parseWakeupArgs(
  raw: unknown,
): { ok: true; args: Args } | { ok: false } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false };
  }
  const v = raw as Record<string, unknown>;
  if (typeof v.note !== "string") return { ok: false };
  const note = v.note.trim();
  if (!note || note.length > MAX_PROMPT_LENGTH) return { ok: false };
  const args: Args = { note };
  if (v.inMinutes !== undefined) {
    const m = v.inMinutes;
    if (
      typeof m !== "number" ||
      !Number.isInteger(m) ||
      m < MIN_INTERVAL_MINUTES ||
      m > MAX_INTERVAL_MINUTES
    ) {
      return { ok: false };
    }
    args.inMinutes = m;
  }
  if (v.afterRoutineId !== undefined) {
    if (!isRoutineId(v.afterRoutineId)) return { ok: false };
    args.afterRoutineId = v.afterRoutineId;
  }
  return args.inMinutes !== undefined || args.afterRoutineId
    ? { ok: true, args }
    : { ok: false };
}

function pendingWakeups(db: DatabaseSync, botId: string): number {
  return listRoutines(db, botId).filter(
    (r) => r.schedule.kind === "once" && r.enabled,
  ).length;
}

/**
 * Lets a bot stop and be woken later: at a time, when one of its routines
 * reports something, or whichever comes first. The wake-up is a one-time
 * routine in its own thread, so the user sees and can cancel it.
 */
export function createWakeupTool(
  db: DatabaseSync,
  clock: () => number = Date.now,
  newId: () => string = () =>
    `w_${clock().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
): ToolDefinition<Args> {
  return {
    name: SCHEDULE_WAKEUP,
    description:
      "Pause and continue this work later. Set inMinutes (5 to 10080) to wake at a time, afterRoutineId to wake when that routine of yours reports something (at most 7 days), or both. The note is the instruction you will get when woken.",
    parameters: {
      type: "object",
      properties: {
        note: {
          type: "string",
          description: "What to do when woken, written as an instruction",
          maxLength: MAX_PROMPT_LENGTH,
        },
        inMinutes: { type: "integer", description: "Minutes from now" },
        afterRoutineId: {
          type: "string",
          description: "Id of one of this bot's routines",
        },
      },
      required: ["note"],
      additionalProperties: false,
    },
    policy: "ask",
    allowAlways: true,
    timeoutMs: 10_000,
    maxResultChars: 500,
    parseArgs: parseWakeupArgs,
    async run(args, ctx) {
      if (ctx.signal.aborted) return { ok: false, code: "aborted" };
      if (!isRoutineId(ctx.botId)) return { ok: false, code: "invalid_bot" };
      if (pendingWakeups(db, ctx.botId) >= MAX_PENDING_WAKEUPS) {
        return { ok: false, code: "too_many_wakeups" };
      }
      const id = newId();
      if (args.afterRoutineId) {
        const target = getRoutine(db, args.afterRoutineId);
        if (
          target?.botId !== ctx.botId ||
          makesCycle(id, args.afterRoutineId, listRoutines(db))
        ) {
          return { ok: false, code: "routine_not_found" };
        }
      }
      const now = clock();
      const at =
        now +
        (args.inMinutes !== undefined
          ? args.inMinutes * 60_000
          : MAX_ONCE_AHEAD_MS);
      const saved = saveRoutine(
        db,
        {
          id,
          botId: ctx.botId,
          title: args.note.replace(/\s+/g, " ").slice(0, TITLE_MAX),
          prompt: args.note,
          schedule: { kind: "once", at },
          enabled: true,
          silentWhenNothingNew: false,
          runInThread: true,
          ...(args.afterRoutineId
            ? { afterRoutineId: args.afterRoutineId }
            : {}),
        },
        now,
      );
      if (!saved.ok) return { ok: false, code: saved.error };
      const when = new Date(at).toISOString();
      return {
        ok: true,
        text: args.afterRoutineId
          ? `Wake-up ${id} set: after routine ${args.afterRoutineId} reports, or at ${when} at the latest.`
          : `Wake-up ${id} set for ${when}.`,
        preview: when,
      };
    },
  };
}
