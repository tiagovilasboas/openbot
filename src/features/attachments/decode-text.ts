/** Control characters that are not line breaks or tabs. */
const STRAY_CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/**
 * The bytes as UTF-8 text, or null when they are not text: a NUL byte or an
 * invalid UTF-8 sequence means a binary file. A leading byte-order mark is
 * dropped.
 */
export function decodeUtf8Strict(bytes: Uint8Array): string | null {
  if (bytes.includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Stray control characters become spaces; they only bloat the request. */
export function stripStrayControls(text: string): string {
  return text.replace(STRAY_CONTROLS, " ");
}

/** The first `max` characters, never ending in half of a surrogate pair. */
export function cutText(text: string, max: number): string {
  if (text.length <= max) return text;
  const last = text.charCodeAt(max - 1);
  const splitsPair = last >= 0xd800 && last <= 0xdbff;
  return text.slice(0, splitsPair ? max - 1 : max);
}
