import type { DatabaseSync } from "node:sqlite";
import type { BotProfile } from "../../../bots/bot-types.ts";
import type { ChatLanguage } from "../../../chat/respond-to-message.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";
import { checkChannelPost, type ChannelMessage } from "../channel-message.ts";
import { isChannelId } from "../crew-channel.ts";
import {
  appendMessage,
  claimTurn,
  finishTurn,
  listMessages,
} from "./channel-messages-repository.ts";
import {
  channelIdParam,
  channelJson,
  readJsonBody,
} from "./channels-handler.ts";
import { getChannel } from "./channels-repository.ts";
import { runChannelTurn } from "./run-channel-turn.ts";

/** GET /api/crew/channels/messages?channelId=: the latest, oldest first. */
export function handleListMessages(
  request: Request,
  db: DatabaseSync,
): Response {
  const id = channelIdParam(request, "channelId");
  if (!id) return channelJson({ error: "invalid_id" }, 400);
  if (!getChannel(db, id)) return channelJson({ error: "not_found" }, 404);
  return channelJson({ messages: listMessages(db, id) });
}

export interface ChannelPostDeps {
  bots: () => BotProfile[];
  language: () => ChatLanguage;
  askModel: AskCrewModel;
  now?: () => number;
}

/**
 * POST /api/crew/channels/messages {channelId, text}: stores the post, runs
 * the channel's crew turn and stores its replies in order. Answers with
 * every message this post added.
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

  const turnId = claimTurn(db, channel.id, now());
  if (turnId === null) return channelJson({ error: "channel_busy" }, 409);
  try {
    const history = listMessages(db, channel.id);
    const added: ChannelMessage[] = [
      appendMessage(db, channel.id, { kind: "human" }, text, now()),
    ];
    const result = await runChannelTurn({
      channel,
      bots: deps.bots(),
      history,
      text,
      language: deps.language(),
      askModel: deps.askModel,
    });
    if (!result.ok) {
      finishTurn(db, turnId, "failed", now());
      return channelJson({ error: result.error, messages: added }, 409);
    }
    for (const reply of result.replies) {
      added.push(
        appendMessage(db, channel.id, reply.author, reply.text, now()),
      );
    }
    finishTurn(db, turnId, "completed", now());
    return channelJson({ messages: added });
  } catch (error) {
    finishTurn(db, turnId, "failed", now());
    throw error;
  }
}
