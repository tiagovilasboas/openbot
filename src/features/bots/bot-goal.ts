export const GOAL_STATUSES = ["active", "paused", "done"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** The one objective a bot keeps: it guides replies while it is active. */
export interface BotGoal {
  title: string;
  description?: string;
  status: GoalStatus;
  /** A short note on how far the goal has come. */
  progress?: string;
  updatedAt: string;
}

export const GOAL_TITLE_MAX_LENGTH = 120;
export const GOAL_DESCRIPTION_MAX_LENGTH = 1000;
export const GOAL_PROGRESS_MAX_LENGTH = 300;

function clean(raw: unknown, max: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  const text = raw.trim().slice(0, max).trim();
  return text || undefined;
}

/** A stored goal, or undefined when it has no usable title. Never throws. */
export function sanitizeGoal(raw: unknown): BotGoal | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const title = clean(obj.title, GOAL_TITLE_MAX_LENGTH);
  if (!title) return undefined;
  const description = clean(obj.description, GOAL_DESCRIPTION_MAX_LENGTH);
  const progress = clean(obj.progress, GOAL_PROGRESS_MAX_LENGTH);
  const status = (GOAL_STATUSES as readonly unknown[]).includes(obj.status)
    ? (obj.status as GoalStatus)
    : "active";
  return {
    title,
    ...(description ? { description } : {}),
    status,
    ...(progress ? { progress } : {}),
    updatedAt:
      typeof obj.updatedAt === "string"
        ? obj.updatedAt.slice(0, 40)
        : new Date().toISOString(),
  };
}

/** A spread-ready `goal`: absent when the stored value is not usable. */
export function optionalGoal(raw: unknown): { goal?: BotGoal } {
  const goal = sanitizeGoal(raw);
  return goal ? { goal } : {};
}

/** The editor's raw goal fields, before trimming. */
export type GoalDraft = {
  title: string;
  description: string;
  status: GoalStatus;
  progress: string;
};

export const EMPTY_GOAL_DRAFT: GoalDraft = {
  title: "",
  description: "",
  status: "active",
  progress: "",
};

export function goalToDraft(goal: BotGoal | undefined): GoalDraft {
  if (!goal) return EMPTY_GOAL_DRAFT;
  return {
    title: goal.title,
    description: goal.description ?? "",
    status: goal.status,
    progress: goal.progress ?? "",
  };
}

/**
 * The goal to save from the editor. An empty title clears it; an unchanged
 * goal keeps its stored date.
 */
export function buildGoal(
  draft: GoalDraft,
  existing: BotGoal | undefined,
  now: Date = new Date(),
): BotGoal | undefined {
  const next = sanitizeGoal({ ...draft, updatedAt: now.toISOString() });
  if (!next) return undefined;
  if (existing) {
    const same = { ...next, updatedAt: existing.updatedAt };
    if (JSON.stringify(same) === JSON.stringify(existing)) return existing;
  }
  return next;
}
