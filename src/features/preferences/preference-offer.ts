import { detectPreference } from "./preference-detect.ts";

interface Turn {
  id: number;
  role: "assistant" | "user";
  text: string;
}

export interface PreferenceOffer {
  /** The reply the chip sits under; one offer per reply. */
  replyId: number;
  text: string;
}

/**
 * The preference to offer after the newest reply: only when the thread ends
 * with an answer to a user message that states one, and it is not already
 * saved. The chip appears after the bot answered, never mid-turn.
 */
export function preferenceOffer(
  turns: readonly Turn[],
  saved: readonly { text: string }[],
): PreferenceOffer | null {
  const reply = turns[turns.length - 1];
  const asked = turns[turns.length - 2];
  if (reply?.role !== "assistant" || asked?.role !== "user") return null;
  const text = detectPreference(asked.text);
  if (!text || saved.some((entry) => entry.text === text)) return null;
  return { replyId: reply.id, text };
}
