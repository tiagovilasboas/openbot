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
    ...(typeof r.parentSeq === "number" ? { parentSeq: r.parentSeq } : {}),
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

export type ChannelRoomSnapshot = {
  messages: ChannelMessage[];
  /** Thread replies per main-timeline message: seq to count. */
  threadCounts: Record<number, number>;
  /** The live turn: null when nobody is answering. */
  turn: { speakingBotId: string | null } | null;
};

function parseTurn(raw: unknown): ChannelRoomSnapshot["turn"] {
  if (typeof raw !== "object" || raw === null) return null;
  const speaking = (raw as Record<string, unknown>).speakingBotId;
  return { speakingBotId: typeof speaking === "string" ? speaking : null };
}

function parseCounts(raw: unknown): Record<number, number> {
  if (typeof raw !== "object" || raw === null) return {};
  const counts: Record<number, number> = {};
  for (const [seq, n] of Object.entries(raw)) {
    if (typeof n === "number" && Number.isSafeInteger(Number(seq))) {
      counts[Number(seq)] = n;
    }
  }
  return counts;
}

/** The room's messages, or the thread under `parentSeq` when given. */
export function fetchChannelMessages(channelId: string, parentSeq?: number) {
  const parent = parentSeq ? `&parentSeq=${parentSeq}` : "";
  const path = `${BASE}/messages?channelId=${encodeURIComponent(channelId)}${parent}`;
  return call(path, { method: "GET" }, (b): ChannelRoomSnapshot => ({
    messages: listOf(b.messages, parseChannelMessage),
    threadCounts: parseCounts(b.threadCounts),
    turn: parseTurn(b.turn),
  }));
}

/** Posts; the group answers in the background. The stored post. */
export function postChannelMessage(
  channelId: string,
  text: string,
  replyToSeq?: number,
  parentSeq?: number,
) {
  return call(
    `${BASE}/messages`,
    json("POST", {
      channelId,
      text,
      ...(replyToSeq ? { replyToSeq } : {}),
      ...(parentSeq ? { parentSeq } : {}),
    }),
    (b) => listOf(b.messages, parseChannelMessage),
  );
}

/** Stops whoever is answering in the group right now. */
export function stopChannel(channelId: string) {
  return call(`${BASE}/stop`, json("POST", { channelId }), () => true as const);
}
