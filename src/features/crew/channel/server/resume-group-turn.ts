import type { ResumeDecision } from "../../../tools/tool-loop-types.ts";
import type { ChannelMessage } from "../channel-message.ts";
import type { ChannelApproval } from "./channel-approvals-repository.ts";
import {
  groupMembers,
  runSpeakers,
  type GroupRoom,
  type GroupTurnDeps,
  type GroupTurnState,
} from "./group-speakers.ts";

/**
 * Goes on with a group turn after the person decided on a member's tool
 * call: that member continues its paused turn, then the members that were
 * waiting their turn answer. `history` is the room as the member saw it.
 * A member removed from the group meanwhile is skipped.
 */
export async function resumeGroupTurn(
  room: GroupRoom,
  approval: ChannelApproval,
  decisions: ResumeDecision[],
  history: ChannelMessage[],
  deps: GroupTurnDeps,
): Promise<GroupTurnState> {
  const byId = new Map(groupMembers(room).map((bot) => [bot.id, bot]));
  const speakers = [approval.botId, ...approval.remaining].flatMap((id) => {
    const bot = byId.get(id);
    return bot ? [bot] : [];
  });
  const paused = speakers[0]?.id === approval.botId;
  return runSpeakers(
    room,
    deps,
    speakers,
    [...history],
    paused ? { turnId: approval.turnId, decisions } : undefined,
  );
}
