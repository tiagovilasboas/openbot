import type { DatabaseSync } from "node:sqlite";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../../server-guard/body-limits.ts";
import { checkCrewChannel, isChannelId } from "../crew-channel.ts";
import {
  deleteChannel,
  getChannel,
  listChannels,
  saveChannel,
} from "./channels-repository.ts";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function channelJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/** The `name` query value when it is a valid id, else null. */
export function channelIdParam(request: Request, name: string): string | null {
  const value = new URL(request.url).searchParams.get(name);
  return isChannelId(value) ? value : null;
}

/** Reads a capped JSON body; undefined when too large, null when not JSON. */
export async function readJsonBody(
  request: Request,
  method: string,
  path: string,
): Promise<unknown> {
  const text = await readBodyWithCap(request, bodyLimitFor(method, path));
  if (text === null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** GET /api/crew/channels: every saved channel. */
export function handleListChannels(db: DatabaseSync): Response {
  return channelJson({ channels: listChannels(db) });
}

/** PUT /api/crew/channels: creates or replaces a channel of existing bots. */
export async function handleSaveChannel(
  request: Request,
  db: DatabaseSync,
  botIds: () => string[],
  now: () => number = Date.now,
): Promise<Response> {
  const body = await readJsonBody(request, "PUT", "/api/crew/channels");
  if (body === undefined) {
    return channelJson({ error: "payload_too_large" }, 413);
  }
  const checked = checkCrewChannel(body);
  if (!checked.ok) return channelJson({ error: checked.problem }, 400);
  const known = new Set(botIds());
  if (!checked.channel.memberBotIds.every((id) => known.has(id))) {
    return channelJson({ error: "bot_missing" }, 404);
  }
  return channelJson({ channel: saveChannel(db, checked.channel, now()) });
}

/** DELETE /api/crew/channels?id=: removes a channel and its messages. */
export function handleDeleteChannel(
  request: Request,
  db: DatabaseSync,
): Response {
  const id = channelIdParam(request, "id");
  if (!id) return channelJson({ error: "invalid_id" }, 400);
  return deleteChannel(db, id)
    ? channelJson({ ok: true })
    : channelJson({ error: "not_found" }, 404);
}

/** True when the channel exists; used by the messages handlers. */
export function channelExists(db: DatabaseSync, id: string): boolean {
  return getChannel(db, id) !== null;
}
