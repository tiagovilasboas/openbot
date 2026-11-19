/** Most bots a channel may hold, the leader included. */
export const MAX_CHANNEL_MEMBERS = 8;
export const MAX_CHANNEL_NAME_LENGTH = 80;
/** The leader's prompt carries them, so they stay a short brief. */
export const MAX_CHANNEL_INSTRUCTIONS_LENGTH = 4_000;

/** A stored crew room: who sits in it, who leads and what it is for. */
export type CrewChannel = {
  id: string;
  name: string;
  memberBotIds: string[];
  /** Plays the Chief in this channel; always one of the members. */
  leaderBotId: string;
  instructions: string;
};

export type CrewChannelProblem =
  | "invalid_body"
  | "invalid_id"
  | "invalid_name"
  | "invalid_members"
  | "too_many_members"
  | "leader_not_member"
  | "invalid_instructions";

export type CrewChannelCheck =
  | { ok: true; channel: CrewChannel }
  | { ok: false; problem: CrewChannelProblem };

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Whether a value can be a channel or bot id (opaque, URL-safe, short). */
export function isChannelId(value: unknown): value is string {
  return typeof value === "string" && ID.test(value);
}

function members(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every(isChannelId)) return null;
  return [...new Set(value as string[])];
}

/** Validates an untrusted channel write. Never throws. */
export function checkCrewChannel(input: unknown): CrewChannelCheck {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, problem: "invalid_body" };
  }
  const raw = input as Record<string, unknown>;
  if (!isChannelId(raw.id) || !isChannelId(raw.leaderBotId)) {
    return { ok: false, problem: "invalid_id" };
  }
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name || name.length > MAX_CHANNEL_NAME_LENGTH) {
    return { ok: false, problem: "invalid_name" };
  }
  const memberBotIds = members(raw.memberBotIds);
  if (!memberBotIds) return { ok: false, problem: "invalid_members" };
  if (memberBotIds.length > MAX_CHANNEL_MEMBERS) {
    return { ok: false, problem: "too_many_members" };
  }
  if (!memberBotIds.includes(raw.leaderBotId)) {
    return { ok: false, problem: "leader_not_member" };
  }
  const instructions = raw.instructions ?? "";
  if (
    typeof instructions !== "string" ||
    instructions.trim().length > MAX_CHANNEL_INSTRUCTIONS_LENGTH
  ) {
    return { ok: false, problem: "invalid_instructions" };
  }
  return {
    ok: true,
    channel: {
      id: raw.id,
      name,
      memberBotIds,
      leaderBotId: raw.leaderBotId,
      instructions: instructions.trim(),
    },
  };
}
