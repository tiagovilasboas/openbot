import { withApiHeaders } from "../../../server-guard/api-request-init.ts";
import { parseChannelAuthor, type ChannelMessage } from "../channel-message.ts";
import { checkCrewChannel, type CrewChannel } from "../crew-channel.ts";

/** What a call failed with: the server's error code, or "network". */
export type ChannelApiResult<T> =
  { ok: true; value: T } | { ok: false; error: string };

const BASE = "/api/crew/channels";

/** Keeps a server message only when its fields are well formed. */
export function parseChannelMessage(raw: unknown): ChannelMessage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const author = parseChannelAuthor(r.author);
  if (
    !author ||
    typeof r.channelId !== "string" ||
    typeof r.seq !== "number" ||
    typeof r.text !== "string" ||
    typeof r.createdAt !== "number"
  ) {
    return null;
  }
  return {
    channelId: r.channelId,
    seq: r.seq,
    author,
    text: r.text,
    createdAt: r.createdAt,
  };
}

function parseChannel(raw: unknown): CrewChannel | null {
  const checked = checkCrewChannel(raw);
  return checked.ok ? checked.channel : null;
}

function listOf<T>(value: unknown, parse: (raw: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(parse).filter((item): item is T => item !== null);
}

async function call<T>(
  path: string,
  init: RequestInit,
  read: (body: Record<string, unknown>) => T,
): Promise<ChannelApiResult<T>> {
  try {
    const response = await fetch(path, withApiHeaders(init));
    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      return {
        ok: false,
        error: typeof body.error === "string" ? body.error : "http",
      };
    }
    return { ok: true, value: read(body) };
  } catch {
    return { ok: false, error: "network" };
  }
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export function fetchChannels() {
  return call(BASE, { method: "GET" }, (b) => listOf(b.channels, parseChannel));
}

export function putChannel(channel: CrewChannel) {
  return call(BASE, json("PUT", channel), (b) => parseChannel(b.channel));
}

export function removeChannel(id: string) {
  const path = `${BASE}?id=${encodeURIComponent(id)}`;
  return call(path, { method: "DELETE" }, () => true as const);
}

export function fetchChannelMessages(channelId: string) {
  const path = `${BASE}/messages?channelId=${encodeURIComponent(channelId)}`;
  return call(path, { method: "GET" }, (b) =>
    listOf(b.messages, parseChannelMessage),
  );
}

/** Posts and waits for the whole crew turn; the messages it added. */
export function postChannelMessage(channelId: string, text: string) {
  return call(`${BASE}/messages`, json("POST", { channelId, text }), (b) =>
    listOf(b.messages, parseChannelMessage),
  );
}
