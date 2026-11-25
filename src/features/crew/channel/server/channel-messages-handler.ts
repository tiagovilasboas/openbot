import type { DatabaseSync } from "node:sqlite";
import type { BotProfile } from "../../../bots/bot-types.ts";
import type { ChatLanguage } from "../../../chat/respond-to-message.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";
import { checkChannelPost } from "../channel-message.ts";
import { isChannelId } from "../crew-channel.ts";
import {
  appendMessage,
  claimTurn,
  finishTurn,
  getMainMessage,
  isTurnOver,
  listMessages,
  listThread,
  runningTurn,
  setSpeaking,
  stopRunningTurns,
  threadCounts,
} from "./channel-messages-repository.ts";
import {
  channelIdParam,
  channelJson,
  readJsonBody,
} from "./channels-handler.ts";
import { getChannel } from "./channels-repository.ts";
import { runGroupTurn } from "./run-group-turn.ts";

/**
 * GET /api/crew/channels/messages?channelId=: the latest messages, oldest
 * first, how many thread replies each has, and the live turn (who is
 * speaking) when one runs. With `parentSeq`, that message's thread instead.
 */
export function handleListMessages(
  request: Request,
  db: DatabaseSync,
  now: () => number = Date.now,
): Response {
  const id = channelIdParam(request, "channelId");
  if (!id) return channelJson({ error: "invalid_id" }, 400);
  if (!getChannel(db, id)) return channelJson({ error: "not_found" }, 404);
  const turn = runningTurn(db, id, now());
  const parent = readSeq(new URL(request.url).searchParams.get("parentSeq"));
  if (parent !== undefined) {
    return channelJson({ messages: listThread(db, id, parent), turn });
  }
  return channelJson({
    messages: listMessages(db, id),
    threadCounts: threadCounts(db, id),
    turn,
  });
}

export interface ChannelPostDeps {
  bots: () => BotProfile[];
  language: () => ChatLanguage;
  askModel: AskCrewModel;
  now?: () => number;
  /**
   * Runs the group's answers after the response is sent. The route lets the
   * promise run on; tests await it.
   */
  schedule?: (work: Promise<void>) => void;
}

function readSeq(raw: unknown): number | undefined {
  const value = typeof raw === "string" && raw !== "" ? Number(raw) : raw;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

/**
 * POST /api/crew/channels/messages {channelId, text, replyToSeq?, parentSeq?}:
 * stores the post and answers at once; the members answer in the background,
 * each stored as it lands. A new post takes priority: it stops the turn still
 * running in this group. With `parentSeq` the post and its answers go to that
 * message's thread and the members read the parent plus the thread.
 */
export async function handlePostMessage(
  request: Request,
  db: DatabaseSync,
  deps: ChannelPostDeps,
): Promise<Response> {
  const now = deps.now ?? Date.now;
  const body = await readJsonBody(
    request,
    "POST",
    "/api/crew/channels/messages",
  );
  if (body === undefined) {
    return channelJson({ error: "payload_too_large" }, 413);
  }
  const raw = (body ?? {}) as Record<string, unknown>;
  if (!isChannelId(raw.channelId)) {
    return channelJson({ error: "invalid_id" }, 400);
  }
  const text = checkChannelPost(raw.text);
  if (!text) return channelJson({ error: "invalid_text" }, 400);
  const channel = getChannel(db, raw.channelId);
  if (!channel) return channelJson({ error: "not_found" }, 404);
  const parentSeq = readSeq(raw.parentSeq);
  const parent =
    parentSeq === undefined ? null : getMainMessage(db, channel.id, parentSeq);
  if (parentSeq !== undefined && !parent) {
    return channelJson({ error: "invalid_parent" }, 400);
  }

  stopRunningTurns(db, channel.id, now());
  const turnId = claimTurn(db, channel.id, now());
  if (turnId === null) return channelJson({ error: "channel_busy" }, 409);
  const replyToSeq = readSeq(raw.replyToSeq);
  const post = appendMessage(
    db,
    channel.id,
    { kind: "human", ...(replyToSeq ? { replyToSeq } : {}) },
    text,
    now(),
    parentSeq,
  );
  const history = parent
    ? [parent, ...listThread(db, channel.id, parent.seq)]
    : listMessages(db, channel.id);
  const work = runGroupTurn(
    {
      channel,
      bots: deps.bots(),
      history,
      post,
      language: deps.language(),
      askModel: deps.askModel,
    },
    {
      append: (author, reply) =>
        appendMessage(db, channel.id, author, reply, now(), parentSeq),
      isOver: () => isTurnOver(db, turnId),
      setSpeaking: (botId) => setSpeaking(db, turnId, botId),
    },
  ).then(
    () => finishTurn(db, turnId, "completed", now()),
    () => finishTurn(db, turnId, "failed", now()),
  );
  (deps.schedule ?? ((p) => void p))(work);
  return channelJson({ messages: [post], turnId }, 202);
}

/** POST /api/crew/channels/stop {channelId}: stops the group's live turn. */
export async function handleStopChannel(
  request: Request,
  db: DatabaseSync,
  now: () => number = Date.now,
): Promise<Response> {
  const body = await readJsonBody(request, "POST", "/api/crew/channels/stop");
  if (body === undefined) {
    return channelJson({ error: "payload_too_large" }, 413);
  }
  const raw = (body ?? {}) as Record<string, unknown>;
  if (!isChannelId(raw.channelId)) {
    return channelJson({ error: "invalid_id" }, 400);
  }
  if (!getChannel(db, raw.channelId)) {
    return channelJson({ error: "not_found" }, 404);
  }
  return channelJson({ stopped: stopRunningTurns(db, raw.channelId, now()) });
}
