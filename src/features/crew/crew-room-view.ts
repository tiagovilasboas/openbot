import type { BotProfile } from "../bots/bot-types.ts";
import type { CrewStepRecord } from "./crew-step-record.ts";
import { MAX_DELEGATIONS_PER_TURN } from "./run-crew-turn.ts";

/** The parts of a stored message the team room reads. */
export interface CrewRoomMessage {
  id: number;
  role: "assistant" | "user";
  text: string;
  delegatedBot?: BotProfile;
  crewStep?: CrewStepRecord;
}

export interface CrewRoomStep {
  /** The id of the stored reply, stable across renders. */
  id: number;
  bot: BotProfile;
  /** What the Chief asked; null on replies saved before it was kept. */
  task: string | null;
  status: "done" | "failed";
  text: string;
  /** Null on replies saved before it was kept. */
  durationMs: number | null;
}

export interface CrewRoomView {
  kickoff: string;
  steps: CrewRoomStep[];
  /** The Chief's final reply, the turn's last stored message. */
  synthesis: { id: number; text: string };
}

/**
 * Reads one turn's stored replies (the Chief's kickoff, the specialists, the
 * Chief's synthesis) as an ordered room. Null when the turn did not delegate:
 * a plain reply, or a single reply from an @mentioned bot, has no steps.
 */
export function buildCrewRoomView(
  turn: readonly CrewRoomMessage[],
): CrewRoomView | null {
  const replies = turn.filter((message) => message.role === "assistant");
  const kickoff = replies[0];
  const synthesis = replies.at(-1);
  if (replies.length < 3 || !kickoff || !synthesis) return null;

  const steps: CrewRoomStep[] = [];
  for (const reply of replies.slice(1, -1)) {
    if (!reply.delegatedBot) continue;
    steps.push({
      id: reply.id,
      bot: reply.delegatedBot,
      task: reply.crewStep?.task ?? null,
      status: reply.crewStep?.ok === false ? "failed" : "done",
      text: reply.text,
      durationMs: reply.crewStep?.durationMs ?? null,
    });
  }
  if (steps.length === 0) return null;

  return {
    kickoff: kickoff.text,
    steps: steps.slice(0, MAX_DELEGATIONS_PER_TURN),
    synthesis: { id: synthesis.id, text: synthesis.text },
  };
}

/**
 * The room of every delegated turn in a thread, keyed by the id of the turn's
 * last reply (the synthesis), where the "Team room" control belongs.
 */
export function crewRoomsBySynthesisId(
  messages: readonly CrewRoomMessage[],
): Map<number, CrewRoomView> {
  const rooms = new Map<number, CrewRoomView>();
  let turn: CrewRoomMessage[] = [];
  const close = () => {
    const room = buildCrewRoomView(turn);
    if (room) rooms.set(room.synthesis.id, room);
    turn = [];
  };
  for (const message of messages) {
    if (message.role === "user") close();
    else turn.push(message);
  }
  close();
  return rooms;
}
