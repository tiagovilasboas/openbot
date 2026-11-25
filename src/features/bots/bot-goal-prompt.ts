import type { Language } from "../language/language.ts";
import type { BotGoal } from "./bot-goal.ts";

const GOAL_LABELS: Record<Language, { head: string; progress: string }> = {
  pt: { head: "Seu objetivo atual:", progress: "Progresso" },
  en: { head: "Your current goal:", progress: "Progress" },
  es: { head: "Tu objetivo actual:", progress: "Progreso" },
};

/**
 * The bot's own objective as a prompt block, or "" when it has none or it is
 * not active. `room` is the most characters it may take; a block that does
 * not fit is cut, never left half-written past the room.
 */
export function buildGoalBlock(
  goal: BotGoal | undefined,
  language: Language,
  room: number,
): string {
  if (!goal || goal.status !== "active" || room <= 0) return "";
  const labels = GOAL_LABELS[language];
  const lines = [labels.head, goal.title];
  if (goal.description) lines.push(goal.description);
  if (goal.progress) lines.push(`${labels.progress}: ${goal.progress}`);
  const block = lines.join("\n");
  return block.length <= room ? block : `${block.slice(0, room - 1)}…`;
}
