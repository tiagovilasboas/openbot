import { buildBotSystemPrompt } from "../../../bots/bot-system-prompt.ts";
import type { BotProfile } from "../../../bots/bot-types.ts";
import type { ChatLanguage } from "../../../chat/respond-to-message.ts";
import { chiefPlainReply } from "../../chief-plain-reply.ts";
import { crewCopy } from "../../crew-copy.ts";
import { buildCrewRoster } from "../../crew-roster.ts";
import { mentionDelegationReply } from "../../mention-routing.ts";
import {
  runCrewTurn,
  type AskCrewModel,
  type CrewMessage,
} from "../../run-crew-turn.ts";
import { channelTurnCopy } from "../channel-copy.ts";
import type { ChannelAuthor, ChannelMessage } from "../channel-message.ts";
import type { CrewChannel } from "../crew-channel.ts";

/** How many earlier person/leader messages the leader reads back. */
const HISTORY_SIZE = 20;

export type ChannelReply = { author: ChannelAuthor; text: string };

export type ChannelTurnResult =
  | { ok: true; replies: ChannelReply[] }
  | { ok: false; error: "leader_missing" };

interface ChannelTurnInput {
  channel: CrewChannel;
  /** Every saved bot; the channel keeps only its members. */
  bots: BotProfile[];
  /** The channel's stored messages before this post, oldest first. */
  history: ChannelMessage[];
  text: string;
  language: ChatLanguage;
  askModel: AskCrewModel;
}

function leaderHistory(history: ChannelMessage[]): CrewMessage[] {
  return history
    .filter((m) => m.author.kind !== "specialist")
    .slice(-HISTORY_SIZE)
    .map((m) => ({
      role: m.author.kind === "human" ? "user" : "assistant",
      text: m.text,
    }));
}

function leaderPrompts(
  leader: BotProfile,
  members: BotProfile[],
  channel: CrewChannel,
  language: ChatLanguage,
) {
  const roster = buildCrewRoster(leader, members, language);
  const brief = channel.instructions
    ? `${channelTurnCopy[language].instructionsHeader}\n${channel.instructions}`
    : "";
  const extra = [brief, roster].filter(Boolean).join("\n\n");
  const reserve =
    Math.max(extra.length, crewCopy[language].synthesisRule.length) + 2;
  const own = buildBotSystemPrompt(leader, language, reserve);
  const chiefPrompt = brief ? `${own}\n\n${brief}` : own;
  return { chiefPrompt, full: extra ? `${own}\n\n${extra}` : own };
}

/**
 * One person's post in a channel: the leader plays the Chief over the
 * channel's members, using the crew turn (one hop, loop guard, @mentions).
 * Returns the replies in the order the channel stores them.
 */
export async function runChannelTurn(
  input: ChannelTurnInput,
): Promise<ChannelTurnResult> {
  const { channel, language, askModel, text } = input;
  const members = input.bots.filter((bot) =>
    channel.memberBotIds.includes(bot.id),
  );
  const leader = members.find((bot) => bot.id === channel.leaderBotId);
  if (!leader) return { ok: false, error: "leader_missing" };
  const leaderAuthor: ChannelAuthor = { kind: "leader", botId: leader.id };
  const history = leaderHistory(input.history);
  const prompts = leaderPrompts(leader, members, channel, language);

  let chiefReply = mentionDelegationReply(text, members, leader.id);
  if (chiefReply === null) {
    const reply = await askModel({
      systemPrompt: prompts.full,
      messages: [...history, { role: "user", text }],
      modelId: leader.modelId,
    }).catch(() => ({ ok: false as const }));
    if (!reply.ok) {
      const failed = channelTurnCopy[language].leaderFailed;
      return { ok: true, replies: [{ author: leaderAuthor, text: failed }] };
    }
    chiefReply = reply.text;
  }

  const turn = await runCrewTurn({
    chief: leader,
    chiefPrompt: prompts.chiefPrompt,
    chiefReply,
    bots: members,
    history,
    userText: text,
    language,
    askModel,
  });
  if (!turn) {
    const plain = chiefPlainReply(chiefReply, members, leader.id, language);
    return { ok: true, replies: [{ author: leaderAuthor, text: plain }] };
  }
  const copy = crewCopy[language];
  const closing = [
    turn.synthesis ?? copy.synthesisFailed,
    turn.stopped ? copy.loopStopped(turn.stopped) : "",
  ].filter(Boolean);
  return {
    ok: true,
    replies: [
      { author: leaderAuthor, text: turn.kickoff },
      ...turn.specialists.map((s) => ({
        author: {
          kind: "specialist" as const,
          botId: s.bot.id,
          task: s.task,
          ok: s.ok,
        },
        text: s.text,
      })),
      { author: leaderAuthor, text: closing.join("\n\n") },
    ],
  };
}
