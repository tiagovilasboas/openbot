/**
 * The bots busy with the turn in flight: the one that took the message and,
 * when the Chief hands the work on, the specialist now answering.
 */
export function workingBotIds(
  busy: boolean,
  turnBotId: string | null,
  specialistId: string | undefined,
): string[] {
  if (!busy || !turnBotId) return [];
  return specialistId && specialistId !== turnBotId
    ? [turnBotId, specialistId]
    : [turnBotId];
}
