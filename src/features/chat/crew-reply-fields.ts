import type { CrewTurn } from "@/features/crew/run-crew-turn.ts";
import type { ChatReplyOutcome } from "./chat-reply-outcome.ts";

/** The crew part of a reply: the kickoff and each specialist's step. */
export function crewReplyFields(
  crewTurn: CrewTurn | null,
): Pick<ChatReplyOutcome, "crew"> {
  return crewTurn
    ? {
        crew: {
          kickoff: crewTurn.kickoff,
          specialists: crewTurn.specialists.map(
            ({ bot, text, task, ok, durationMs, incomplete }) => ({
              bot,
              text,
              step: {
                task,
                ok,
                durationMs,
                ...(incomplete ? { incomplete } : {}),
              },
            }),
          ),
        },
      }
    : {};
}
