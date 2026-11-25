import type { BotProfile } from "../../../bots/bot-types.ts";
import {
  crewRoomsBySynthesisId,
  type CrewRoomMessage,
  type CrewRoomView,
} from "../../crew-room-view.ts";
import { inChannelOrder, type ChannelMessage } from "../channel-message.ts";

/** One line of the channel as the room shows it. */
export type ChannelEntry = {
  seq: number;
  /** Null for the person; the bot otherwise (null too if it was deleted). */
  bot: BotProfile | null;
  fromPerson: boolean;
  text: string;
  /** The turn's team room, on the leader's closing reply of a delegated turn. */
  room?: CrewRoomView;
  /** A member's answer that failed. */
  failed?: boolean;
  /** The message this post answered, when the person replied to one. */
  replyTo?: { seq: number; bot: BotProfile | null; text: string };
  /** How many thread replies this message has; absent when none. */
  replyCount?: number;
};

function asRoomMessage(
  message: ChannelMessage,
  byId: Map<string, BotProfile>,
): CrewRoomMessage {
  const { author } = message;
  if (author.kind === "human") {
    return { id: message.seq, role: "user", text: message.text };
  }
  const bot = byId.get(author.botId);
  return {
    id: message.seq,
    role: "assistant",
    text: message.text,
    ...(author.kind === "specialist" && bot
      ? {
          delegatedBot: bot,
          crewStep: { task: author.task, ok: author.ok },
        }
      : {}),
  };
}

/**
 * The channel in sequence order. A delegated turn's specialist answers fold
 * into the team room on the leader's closing reply, as in the chat; answers
 * outside a room (a deleted bot, say) stay in the timeline.
 */
export function buildChannelTimeline(
  messages: readonly ChannelMessage[],
  bots: readonly BotProfile[],
  threadCounts: Readonly<Record<number, number>> = {},
): ChannelEntry[] {
  const byId = new Map(bots.map((bot) => [bot.id, bot]));
  const ordered = inChannelOrder(messages);
  const rooms = crewRoomsBySynthesisId(
    ordered.map((m) => asRoomMessage(m, byId)),
  );
  const inRoom = new Set<number>();
  for (const room of rooms.values()) {
    for (const step of room.steps) inRoom.add(step.id);
  }
  return ordered
    .filter((m) => !inRoom.has(m.seq))
    .map((m): ChannelEntry => {
      const room = rooms.get(m.seq);
      const replyToSeq =
        m.author.kind === "human" ? m.author.replyToSeq : undefined;
      const target =
        replyToSeq === undefined
          ? undefined
          : ordered.find((other) => other.seq === replyToSeq);
      return {
        seq: m.seq,
        bot:
          m.author.kind === "human" ? null : (byId.get(m.author.botId) ?? null),
        fromPerson: m.author.kind === "human",
        text: m.text,
        ...(room ? { room } : {}),
        ...(threadCounts[m.seq] ? { replyCount: threadCounts[m.seq] } : {}),
        ...(m.author.kind === "member" && !m.author.ok ? { failed: true } : {}),
        ...(target
          ? {
              replyTo: {
                seq: target.seq,
                bot:
                  target.author.kind === "human"
                    ? null
                    : (byId.get(target.author.botId) ?? null),
                text: target.text,
              },
            }
          : {}),
      };
    });
}
