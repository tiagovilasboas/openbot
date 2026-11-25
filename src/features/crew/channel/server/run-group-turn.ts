import { buildBotSystemPrompt } from "../../../bots/bot-system-prompt.ts";
import type { BotProfile } from "../../../bots/bot-types.ts";
import type { ChatLanguage } from "../../../chat/respond-to-message.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";
import type { ChannelAuthor, ChannelMessage } from "../channel-message.ts";
import type { CrewChannel } from "../crew-channel.ts";
import {
  groupRule,
  isSkip,
  MAX_GROUP_RESPONDERS,
  parsePickerAnswer,
  pickerPrompt,
  pickResponders,
  speakerMessages,
} from "./group-chat.ts";

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

export interface GroupTurnDeps {
  /** Stores one message and returns it as stored. */
  append: (author: ChannelAuthor, text: string) => ChannelMessage;
  /** True once the person stopped the turn or a newer post replaced it. */
  isOver: () => boolean;
  setSpeaking: (botId: string | null) => void;
}

interface GroupTurnInput {
  channel: CrewChannel;
  bots: BotProfile[];
  /** The group's messages up to and including the person's post. */
  history: ChannelMessage[];
  post: ChannelMessage;
  language: ChatLanguage;
  askModel: AskCrewModel;
}

/** Who answers: the fixed pick, else the members' choice, else the first. */
async function responders(
  input: GroupTurnInput,
  members: BotProfile[],
): Promise<BotProfile[]> {
  const replyToSeq =
    input.post.author.kind === "human"
      ? input.post.author.replyToSeq
      : undefined;
  // In a thread the parent message is what the person answers by default.
  const target = replyToSeq ?? input.post.parentSeq;
  const replyTo =
    target === undefined
      ? null
      : (input.history.find((m) => m.seq === target) ?? null);
  const pick = pickResponders({ text: input.post.text, members, replyTo });
  let ids: string[];
  if (pick.kind === "fixed") {
    ids = pick.botIds;
  } else {
    const lead =
      members.find((bot) => bot.id === input.channel.leaderBotId) ??
      members[0]!;
    const answer = await input
      .askModel({
        systemPrompt: pickerPrompt(members, input.language),
        messages: [{ role: "user", text: input.post.text }],
        modelId: lead.modelId,
      })
      .catch(() => ({ ok: false as const }));
    ids = answer.ok ? parsePickerAnswer(answer.text, members) : [];
    if (ids.length === 0) ids = [lead.id];
  }
  const byId = new Map(members.map((bot) => [bot.id, bot]));
  return ids
    .map((id) => byId.get(id))
    .filter((bot): bot is BotProfile => bot !== undefined)
    .slice(0, pick.kind === "fixed" ? ids.length : MAX_GROUP_RESPONDERS);
}

/**
 * One post in a group: the chosen members answer one after another, each
 * seeing the group so far, and each answer is stored as soon as it lands so
 * the room shows it live. Stops at once when the turn is over.
 */
export async function runGroupTurn(
  input: GroupTurnInput,
  deps: GroupTurnDeps,
): Promise<void> {
  const members = input.bots.filter(
    (bot) => input.channel.memberBotIds.includes(bot.id) && !bot.hidden,
  );
  if (members.length === 0 || deps.isOver()) return;
  const speakers = await responders(input, members);
  const seen = [...input.history];
  for (const speaker of speakers) {
    if (deps.isOver()) return;
    deps.setSpeaking(speaker.id);
    const notes = input.channel.instructions.trim();
    const rule = [
      groupRule(speaker, members, input.language),
      ...(notes ? [`${INSTRUCTIONS[input.language]}\n${notes}`] : []),
    ].join("\n\n");
    const own = buildBotSystemPrompt(speaker, input.language, rule.length + 2);
    const reply = await input
      .askModel({
        systemPrompt: `${own}\n\n${rule}`,
        messages: speakerMessages(
          seen,
          speaker,
          input.bots,
          input.post.parentSeq,
        ),
        modelId: speaker.modelId,
        speaker,
      })
      .catch(() => ({ ok: false as const }));
    if (deps.isOver()) return;
    if (reply.ok && isSkip(reply.text)) continue;
    const ok = reply.ok && reply.text.trim() !== "";
    const text = ok ? reply.text.trim() : FAILED[input.language];
    seen.push(deps.append({ kind: "member", botId: speaker.id, ok }, text));
  }
  deps.setSpeaking(null);
}
