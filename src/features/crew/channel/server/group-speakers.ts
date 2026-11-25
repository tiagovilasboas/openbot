import { buildBotSystemPrompt } from "../../../bots/bot-system-prompt.ts";
import type { BotProfile } from "../../../bots/bot-types.ts";
import type { ChatLanguage } from "../../../chat/respond-to-message.ts";
import type { ResumeDecision } from "../../../tools/tool-loop-types.ts";
import type { ToolPause } from "../../../tools/tool-turn-events.ts";
import type { AskCrewModel, CrewModelReply } from "../../run-crew-turn.ts";
import type { ChannelAuthor, ChannelMessage } from "../channel-message.ts";
import type { CrewChannel } from "../crew-channel.ts";
import { groupRule, isSkip, speakerMessages } from "./group-chat.ts";

const INSTRUCTIONS: Record<ChatLanguage, string> = {
  pt: "Instruções deste grupo:",
  en: "This group's instructions:",
  es: "Instrucciones de este grupo:",
};

const FAILED: Record<ChatLanguage, string> = {
  pt: "Não consegui responder agora.",
  en: "I could not answer right now.",
  es: "No pude responder ahora.",
};

/** A member whose tool call waits for the person, and who answers after it. */
export type GroupWait = {
  botId: string;
  pause: ToolPause;
  remaining: string[];
};

export interface GroupTurnDeps {
  /** Stores one message and returns it as stored. */
  append: (author: ChannelAuthor, text: string) => ChannelMessage;
  /** True once the person stopped the turn or a newer post replaced it. */
  isOver: () => boolean;
  setSpeaking: (botId: string | null) => void;
  /** Keeps the wait; the turn goes on when the person decides. */
  pause: (wait: GroupWait) => void;
}

/** What the members need to answer, with or without a new post. */
export interface GroupRoom {
  channel: CrewChannel;
  bots: BotProfile[];
  language: ChatLanguage;
  askModel: AskCrewModel;
  /** The thread the members answer in; absent on the main timeline. */
  parentSeq?: number;
}

/** "paused": a member waits for the person, and the turn is not finished. */
export type GroupTurnState = "done" | "paused";

/** The channel's members that can answer (hidden bots never do). */
export function groupMembers(room: GroupRoom): BotProfile[] {
  return room.bots.filter(
    (bot) => room.channel.memberBotIds.includes(bot.id) && !bot.hidden,
  );
}

/**
 * The chosen members answer one after another, each seeing the group so far,
 * and each answer is stored as soon as it lands so the room shows it live.
 * The first speaker may carry the decisions on its own paused tool call. A
 * member whose tool call needs approval pauses the turn right there.
 */
export async function runSpeakers(
  room: GroupRoom,
  deps: GroupTurnDeps,
  speakers: BotProfile[],
  seen: ChannelMessage[],
  resume?: { turnId: string; decisions: ResumeDecision[] },
): Promise<GroupTurnState> {
  const members = groupMembers(room);
  for (const [index, speaker] of speakers.entries()) {
    if (deps.isOver()) return "done";
    deps.setSpeaking(speaker.id);
    const notes = room.channel.instructions.trim();
    const rule = [
      groupRule(speaker, members, room.language),
      ...(notes ? [`${INSTRUCTIONS[room.language]}\n${notes}`] : []),
    ].join("\n\n");
    const own = buildBotSystemPrompt(speaker, room.language, rule.length + 2);
    const reply = await room
      .askModel({
        systemPrompt: `${own}\n\n${rule}`,
        messages: speakerMessages(seen, speaker, room.bots, room.parentSeq),
        modelId: speaker.modelId,
        speaker,
        ...(index === 0 && resume ? { resume } : {}),
      })
      .catch((): CrewModelReply => ({ ok: false }));
    if (deps.isOver()) return "done";
    if (!reply.ok && reply.pause) {
      const remaining = speakers.slice(index + 1).map((bot) => bot.id);
      deps.pause({ botId: speaker.id, pause: reply.pause, remaining });
      return "paused";
    }
    if (reply.ok && isSkip(reply.text)) continue;
    const ok = reply.ok && reply.text.trim() !== "";
    const text = ok ? reply.text.trim() : FAILED[room.language];
    seen.push(deps.append({ kind: "member", botId: speaker.id, ok }, text));
  }
  deps.setSpeaking(null);
  return "done";
}
