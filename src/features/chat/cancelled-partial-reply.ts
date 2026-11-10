import type { ChatReplyOutcome } from "./execute-chat-message.ts";
import type { LiveEntry } from "./live-board.ts";

/**
 * What a cancel keeps: the text that had arrived, with the last reply marked
 * as cancelled. Earlier entries are a delegated turn's kickoff and finished
 * specialists, so they stay too. Null when nothing had arrived yet.
 */
export function cancelledPartialReply(
  entries: LiveEntry[],
): ChatReplyOutcome | null {
  const shown = entries.filter((entry) => entry.text.trim());
  const last = shown.at(-1);
  if (!last) return null;
  const [kickoff, ...specialists] = shown.slice(0, -1);
  return {
    text: last.text,
    delegatedBot: last.delegatedBot,
    incomplete: "cancelled",
    ...(kickoff
      ? {
          crew: {
            kickoff: kickoff.text,
            specialists: specialists.flatMap(({ delegatedBot, text }) =>
              delegatedBot ? [{ bot: delegatedBot, text }] : [],
            ),
          },
        }
      : {}),
  };
}
