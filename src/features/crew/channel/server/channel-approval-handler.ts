import type { DatabaseSync } from "node:sqlite";
import { parseResume } from "../../../tools/server/parse-tool-turn.ts";
import { closePendingTurn } from "../../../tools/server/pending-turns-repository.ts";
import { isChannelId } from "../crew-channel.ts";
import { takeApproval } from "./channel-approvals-repository.ts";
import type { ChannelPostDeps } from "./channel-messages-handler.ts";
import {
  getMainMessage,
  isTurnOver,
  listMessages,
  listThread,
} from "./channel-messages-repository.ts";
import { channelJson, readJsonBody } from "./channels-handler.ts";
import { getChannel } from "./channels-repository.ts";
import { groupTurnDeps, settleGroupTurn } from "./group-turn-wiring.ts";
import { resumeGroupTurn } from "./resume-group-turn.ts";

/**
 * POST /api/crew/channels/approval {channelId, turnId, decisions}: the
 * person's answer to a member's tool call, bound to the stored call and its
 * digest as in a 1:1 chat. Answers at once; the member continues in the
 * background and the rest of the group turn follows. The approval resumes
 * once, and only while its group turn still runs (Stop or a new post ended
 * it otherwise).
 */
export async function handleResolveApproval(
  request: Request,
  db: DatabaseSync,
  deps: ChannelPostDeps,
): Promise<Response> {
  const now = deps.now ?? Date.now;
  const body = await readJsonBody(
    request,
    "POST",
    "/api/crew/channels/approval",
  );
  if (body === undefined) {
    return channelJson({ error: "payload_too_large" }, 413);
  }
  const raw = (body ?? {}) as Record<string, unknown>;
  if (!isChannelId(raw.channelId)) {
    return channelJson({ error: "invalid_id" }, 400);
  }
  const resume = parseResume({
    turnId: raw.turnId,
    decisions: raw.decisions,
  });
  if (!resume) return channelJson({ error: "invalid_request" }, 400);
  const channel = getChannel(db, raw.channelId);
  if (!channel) return channelJson({ error: "not_found" }, 404);

  const approval = takeApproval(db, channel.id, resume.turnId);
  if (!approval || isTurnOver(db, approval.groupTurnId)) {
    if (approval) closePendingTurn(db, approval.turnId, "expired");
    return channelJson({ error: "turn_expired" }, 410);
  }
  const parentSeq = approval.parentSeq ?? undefined;
  const parent =
    parentSeq === undefined ? null : getMainMessage(db, channel.id, parentSeq);
  const history = parent
    ? [parent, ...listThread(db, channel.id, parent.seq)]
    : listMessages(db, channel.id);
  const work = resumeGroupTurn(
    {
      channel,
      bots: deps.bots(),
      language: deps.language(),
      askModel: deps.askModel,
      parentSeq,
    },
    approval,
    resume.decisions,
    history,
    groupTurnDeps(db, channel.id, approval.groupTurnId, parentSeq, now),
  );
  (deps.schedule ?? ((p) => void p))(
    settleGroupTurn(db, approval.groupTurnId, work, now),
  );
  return channelJson({ resumed: true }, 202);
}
