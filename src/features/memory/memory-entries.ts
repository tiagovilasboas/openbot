/**
 * A bot's memory: short notes the user writes, sees, edits and deletes.
 * Everything here is pure; storage and the prompt live in their own files.
 * Text from storage, backups and requests is untrusted and goes through
 * `capMemoryTexts` or `sanitizeMemoryEntries` before anything uses it.
 */

export interface MemoryEntry {
  id: string;
  text: string;
  createdAt: string;
}

export const MEMORY_MAX_ENTRIES = 30;
export const MEMORY_MAX_ENTRY_LENGTH = 300;
export const MEMORY_MAX_TOTAL_LENGTH = 4000;

const MAX_ID_LENGTH = 64;
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g;

export type MemoryEditFailure =
  "empty" | "too_long" | "too_many" | "total_too_long" | "not_found";

export type MemoryEditResult =
  | { ok: true; entries: MemoryEntry[] }
  | { ok: false; reason: MemoryEditFailure };

/** One line of plain text: control characters and runs of spaces collapse. */
export function normalizeMemoryText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
}

/** Normalized and cut to the per-entry limit; empty when nothing is left. */
function clipMemoryText(raw: unknown): string {
  return normalizeMemoryText(raw).slice(0, MEMORY_MAX_ENTRY_LENGTH).trim();
}

function totalLength(entries: readonly { text: string }[]): number {
  return entries.reduce((sum, entry) => sum + entry.text.length, 0);
}

/** The leading items that fit the count and total limits, in order. */
function withinLimits<T extends { text: string }>(items: readonly T[]): T[] {
  const kept: T[] = [];
  let total = 0;
  for (const item of items) {
    if (kept.length >= MEMORY_MAX_ENTRIES) break;
    if (total + item.text.length > MEMORY_MAX_TOTAL_LENGTH) break;
    kept.push(item);
    total += item.text.length;
  }
  return kept;
}

/**
 * The notes that may reach a prompt, in order: each one normalized and cut
 * to its limit, then as many as fit the count and total limits. Anything
 * that is not a string is dropped. The server and the client share this.
 */
export function capMemoryTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const notes = raw
    .map(clipMemoryText)
    .filter(Boolean)
    .map((text) => ({ text }));
  return withinLimits(notes).map((note) => note.text);
}

function validText(text: unknown): string | MemoryEditFailure {
  const normalized = normalizeMemoryText(text);
  if (!normalized) return "empty";
  if (normalized.length > MEMORY_MAX_ENTRY_LENGTH) return "too_long";
  return normalized;
}

function isFailure(value: string): value is MemoryEditFailure {
  return value === "empty" || value === "too_long";
}

export function addMemoryEntry(
  entries: readonly MemoryEntry[],
  text: unknown,
  id: string,
  now: Date = new Date(),
): MemoryEditResult {
  const valid = validText(text);
  if (isFailure(valid)) return { ok: false, reason: valid };
  if (entries.length >= MEMORY_MAX_ENTRIES) {
    return { ok: false, reason: "too_many" };
  }
  if (totalLength(entries) + valid.length > MEMORY_MAX_TOTAL_LENGTH) {
    return { ok: false, reason: "total_too_long" };
  }
  const entry: MemoryEntry = { id, text: valid, createdAt: now.toISOString() };
  return { ok: true, entries: [...entries, entry] };
}

export function editMemoryEntry(
  entries: readonly MemoryEntry[],
  id: string,
  text: unknown,
): MemoryEditResult {
  const valid = validText(text);
  if (isFailure(valid)) return { ok: false, reason: valid };
  const current = entries.find((entry) => entry.id === id);
  if (!current) return { ok: false, reason: "not_found" };
  const others = totalLength(entries) - current.text.length;
  if (others + valid.length > MEMORY_MAX_TOTAL_LENGTH) {
    return { ok: false, reason: "total_too_long" };
  }
  return {
    ok: true,
    entries: entries.map((entry) =>
      entry.id === id ? { ...entry, text: valid } : entry,
    ),
  };
}

export function removeMemoryEntry(
  entries: readonly MemoryEntry[],
  id: string,
): MemoryEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export function clearMemory(): MemoryEntry[] {
  return [];
}

function validDate(raw: unknown): string {
  if (typeof raw === "string" && raw.length <= 40) {
    const time = Date.parse(raw);
    if (Number.isFinite(time)) return new Date(time).toISOString();
  }
  return new Date(0).toISOString();
}

/**
 * Rebuilds a stored or imported list from untrusted data. Only the own
 * `text`, `id` and `createdAt` fields are read, so a hostile `__proto__`
 * key is inert; every limit applies and unknown fields are dropped.
 */
export function sanitizeMemoryEntries(raw: unknown): MemoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const candidates: MemoryEntry[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const source = item as Record<string, unknown>;
    const text = clipMemoryText(source.text);
    if (!text) continue;
    const rawId = typeof source.id === "string" ? source.id.trim() : "";
    const id =
      rawId && rawId.length <= MAX_ID_LENGTH && !seen.has(rawId)
        ? rawId
        : `mem_${candidates.length}`;
    if (seen.has(id)) continue;
    seen.add(id);
    candidates.push({ id, text, createdAt: validDate(source.createdAt) });
  }
  return withinLimits(candidates);
}
