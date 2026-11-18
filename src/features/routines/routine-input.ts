import { checkSchedule, type RoutineSchedule } from "./routine-schedule.ts";

export const MAX_ROUTINES_PER_BOT = 64;
export const MAX_TITLE_LENGTH = 120;
// The chat request clamps each message to 4000 characters; a longer prompt
// would be cut silently, so it is refused here instead.
export const MAX_PROMPT_LENGTH = 4_000;

/** What a client may write for a routine; run state is the server's own. */
export type RoutineInput = {
  id: string;
  botId: string;
  title: string;
  prompt: string;
  schedule: RoutineSchedule;
  enabled: boolean;
  silentWhenNothingNew: boolean;
  /** Each run lands in a thread of its own in the bot's chat. */
  runInThread: boolean;
};

export type RoutineInputProblem =
  | "invalid_body"
  | "invalid_id"
  | "invalid_title"
  | "invalid_prompt"
  | "invalid_schedule";

export type RoutineInputCheck =
  | { ok: true; routine: RoutineInput }
  | { ok: false; problem: RoutineInputProblem };

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Whether a value can be a routine or bot id (opaque, URL-safe, short). */
export function isRoutineId(value: unknown): value is string {
  return typeof value === "string" && ID.test(value);
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

/** Validates an untrusted routine write. Never throws. */
export function checkRoutineInput(input: unknown): RoutineInputCheck {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, problem: "invalid_body" };
  }
  const raw = input as Record<string, unknown>;
  if (!isRoutineId(raw.id) || !isRoutineId(raw.botId)) {
    return { ok: false, problem: "invalid_id" };
  }
  const title = text(raw.title, MAX_TITLE_LENGTH);
  if (!title) return { ok: false, problem: "invalid_title" };
  const prompt = text(raw.prompt, MAX_PROMPT_LENGTH);
  if (!prompt) return { ok: false, problem: "invalid_prompt" };
  const schedule = checkSchedule(raw.schedule);
  if (!schedule.ok) return { ok: false, problem: "invalid_schedule" };
  return {
    ok: true,
    routine: {
      id: raw.id,
      botId: raw.botId,
      title,
      prompt,
      schedule: schedule.schedule,
      enabled: raw.enabled !== false,
      silentWhenNothingNew: raw.silentWhenNothingNew === true,
      runInThread: raw.runInThread === true,
    },
  };
}
