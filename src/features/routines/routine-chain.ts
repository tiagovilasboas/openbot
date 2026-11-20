// Chained routines: a routine may also run right after another one of the
// same bot finishes with something new. Pure: no storage, no clock.

/** Longest chain one run may start, counting the first routine. */
export const MAX_CHAIN_DEPTH = 5;

type Link = {
  id: string;
  botId: string;
  enabled: boolean;
  afterRoutineId?: string;
};

/** The routines that follow `finished`, enabled and of the same bot. */
export function followersOf<R extends Link>(
  finished: Pick<Link, "id" | "botId">,
  routines: readonly R[],
): R[] {
  return routines.filter(
    (r) =>
      r.enabled &&
      r.afterRoutineId === finished.id &&
      r.botId === finished.botId &&
      r.id !== finished.id,
  );
}

/**
 * Whether linking `id` after `afterId` would make a loop: walking the
 * "after" links from `afterId` reaches `id` again.
 */
export function makesCycle(
  id: string,
  afterId: string,
  routines: readonly Pick<Link, "id" | "afterRoutineId">[],
): boolean {
  const byId = new Map(routines.map((r) => [r.id, r.afterRoutineId]));
  const seen = new Set<string>();
  let current: string | undefined = afterId;
  while (current) {
    if (current === id) return true;
    if (seen.has(current)) return false;
    seen.add(current);
    current = byId.get(current);
  }
  return false;
}

const CHAIN_INTRO = {
  pt: "Resultado da rotina anterior:",
  en: "Result of the previous routine:",
  es: "Resultado de la rutina anterior:",
} as const;

/**
 * The prompt of a chained run: its own prompt, then the previous result,
 * already wrapped as data by the caller.
 */
export function chainedPrompt(
  prompt: string,
  wrappedPrevious: string | undefined,
  language: keyof typeof CHAIN_INTRO,
): string {
  return wrappedPrevious
    ? `${prompt}\n\n${CHAIN_INTRO[language]}\n${wrappedPrevious}`
    : prompt;
}
