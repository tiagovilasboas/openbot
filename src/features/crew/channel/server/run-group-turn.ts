import type { BotProfile } from "../../../bots/bot-types.ts";
import type { ChannelMessage } from "../channel-message.ts";
import {
  MAX_GROUP_RESPONDERS,
  parsePickerAnswer,
  pickerPrompt,
  pickResponders,
} from "./group-chat.ts";
import {
  groupMembers,
  runSpeakers,
  type GroupRoom,
  type GroupTurnDeps,
  type GroupTurnState,
} from "./group-speakers.ts";

interface GroupTurnInput extends GroupRoom {
  /** The group's messages up to and including the person's post. */
  history: ChannelMessage[];
  post: ChannelMessage;
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
 * the room shows it live. Stops at once when the turn is over, and pauses
 * when a member's tool call waits for the person (see runSpeakers).
 */
export async function runGroupTurn(
  input: GroupTurnInput,
  deps: GroupTurnDeps,
): Promise<GroupTurnState> {
  const members = groupMembers(input);
  if (members.length === 0 || deps.isOver()) return "done";
  const speakers = await responders(input, members);
  return runSpeakers(
    { ...input, parentSeq: input.post.parentSeq },
    deps,
    speakers,
    [...input.history],
  );
}
