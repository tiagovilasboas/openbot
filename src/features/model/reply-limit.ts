/**
 * Most characters of one streamed reply that either side will accept. The
 * server stops reading a provider past it and the client stops appending, so a
 * hostile or broken upstream cannot grow memory or localStorage without bound.
 */
export const MAX_REPLY_CHARS = 200_000;

export type ReplyChunk = { text: string; exceeded: boolean };

/**
 * The part of `text` that still fits after `used` characters. `exceeded` is
 * true when something had to be dropped. A cut never splits a surrogate pair.
 */
export function fitReplyChunk(
  used: number,
  text: string,
  max: number = MAX_REPLY_CHARS,
): ReplyChunk {
  const room = Math.max(0, max - used);
  if (text.length <= room) return { text, exceeded: false };
  let end = room;
  const last = text.charCodeAt(end - 1);
  if (end > 0 && last >= 0xd800 && last <= 0xdbff) end -= 1;
  return { text: text.slice(0, end), exceeded: true };
}
