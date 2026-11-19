/** Most automatic assignments one root request may start (AU-01). */
export const CHANNEL_ASSIGNMENT_LIMIT = 8;
/** Most turns a channel may run at once (AU-01). */
export const CHANNEL_PARALLEL_LIMIT = 2;

export type ChannelLimitVerdict =
  | { allowed: true }
  | { allowed: false; reason: "assignment_limit" | "parallel_limit" };

/** Whether one request may start this many assignments. */
export function checkAssignmentLimit(count: number): ChannelLimitVerdict {
  return count <= CHANNEL_ASSIGNMENT_LIMIT
    ? { allowed: true }
    : { allowed: false, reason: "assignment_limit" };
}

/** Whether a new turn may start while `active` turns are still running. */
export function checkParallelLimit(active: number): ChannelLimitVerdict {
  return active < CHANNEL_PARALLEL_LIMIT
    ? { allowed: true }
    : { allowed: false, reason: "parallel_limit" };
}

/** The assignments one request keeps: the first ones, up to the limit. */
export function capAssignments<T>(assignments: readonly T[]): T[] {
  return assignments.slice(0, CHANNEL_ASSIGNMENT_LIMIT);
}
