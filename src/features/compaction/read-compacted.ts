import type { MessageData } from "../chat/ChatMessageItem.tsx";
import { ARCHIVED_MAX, type CompactedMeta } from "./compaction-types.ts";

/**
 * Reads the stored marker data. `readEntry` is the caller's own message
 * sanitizer (the chat store and the backup differ in their caps); archived
 * entries are plain messages, never markers themselves. Undefined when
 * nothing usable is left, so the message then reads as a plain reply.
 */
export function readCompacted(
  raw: unknown,
  readEntry: (entry: unknown) => MessageData | null,
): CompactedMeta | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const { originalCount, compactedAt, archived } = raw as Record<
    string,
    unknown
  >;
  if (typeof compactedAt !== "string" || !Array.isArray(archived)) {
    return undefined;
  }
  const kept: MessageData[] = [];
  for (const entry of archived.slice(-ARCHIVED_MAX)) {
    const message = readEntry(entry);
    if (message) kept.push(message);
  }
  if (kept.length === 0) return undefined;
  const count =
    typeof originalCount === "number" &&
    Number.isSafeInteger(originalCount) &&
    originalCount >= kept.length
      ? originalCount
      : kept.length;
  return {
    originalCount: count,
    compactedAt: compactedAt.slice(0, 40),
    archived: kept,
  };
}
