import {
  checkCrewChannel,
  MAX_CHANNEL_MEMBERS,
  type CrewChannel,
  type CrewChannelProblem,
} from "../crew-channel.ts";

/** The channel form's state; the same shape the server stores. */
export type ChannelDraft = CrewChannel;

/** A short random id that passes the server's id check. */
export function newChannelId(random: () => number = Math.random): string {
  const part = () => Math.floor(random() * 36 ** 6).toString(36);
  return `ch_${part()}${part()}`;
}

/** A fresh channel led by the main bot, the crew's Chief. */
export function emptyChannelDraft(
  leaderBotId: string,
  id: string = newChannelId(),
): ChannelDraft {
  return {
    id,
    name: "",
    memberBotIds: [leaderBotId],
    leaderBotId,
    instructions: "",
  };
}

/**
 * Adds or removes a member. Adding past the cap does nothing; removing the
 * leader hands the lead to the first member left.
 */
export function toggleMember(draft: ChannelDraft, botId: string): ChannelDraft {
  if (!draft.memberBotIds.includes(botId)) {
    if (draft.memberBotIds.length >= MAX_CHANNEL_MEMBERS) return draft;
    return { ...draft, memberBotIds: [...draft.memberBotIds, botId] };
  }
  const memberBotIds = draft.memberBotIds.filter((id) => id !== botId);
  const leaderBotId =
    draft.leaderBotId === botId ? (memberBotIds[0] ?? "") : draft.leaderBotId;
  return { ...draft, memberBotIds, leaderBotId };
}

/** Makes a member the leader; a non-member is ignored. */
export function setLeader(draft: ChannelDraft, botId: string): ChannelDraft {
  return draft.memberBotIds.includes(botId)
    ? { ...draft, leaderBotId: botId }
    : draft;
}

/** What blocks saving, checked the way the server checks it. */
export function channelDraftProblem(
  draft: ChannelDraft,
): CrewChannelProblem | null {
  const checked = checkCrewChannel(draft);
  return checked.ok ? null : checked.problem;
}

/** Whether another member may still be added. */
export function canAddMember(draft: ChannelDraft): boolean {
  return draft.memberBotIds.length < MAX_CHANNEL_MEMBERS;
}
