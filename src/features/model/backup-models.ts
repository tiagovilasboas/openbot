import { isModelAllowed } from "./allowed-models.ts";
import { parseModelId, sanitizeModelId } from "./model-id.ts";

/** Most backup models one bot keeps. */
export const BACKUP_MODELS_MAX = 3;

export type ParsedBackupModelIds = { ok: true; ids: string[] } | { ok: false };

/** Lenient form for stored data: bad entries and repeats are dropped. */
export function sanitizeBackupModelIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const entry of raw) {
    const id = sanitizeModelId(entry);
    if (id && !ids.includes(id)) ids.push(id);
    if (ids.length === BACKUP_MODELS_MAX) break;
  }
  return ids;
}

/** Strict form for a request: absent is fine, a bad list is refused. */
export function parseBackupModelIds(raw: unknown): ParsedBackupModelIds {
  if (raw === undefined || raw === null) return { ok: true, ids: [] };
  if (!Array.isArray(raw) || raw.length > BACKUP_MODELS_MAX) {
    return { ok: false };
  }
  const ids: string[] = [];
  for (const entry of raw) {
    const parsed = parseModelId(entry);
    if (!parsed.ok) return { ok: false };
    if (parsed.modelId && !ids.includes(parsed.modelId)) {
      ids.push(parsed.modelId);
    }
  }
  return { ok: true, ids };
}

/** The editor's text (ids split by commas, spaces or lines) as a strict list. */
export function parseBackupModelsText(text: string): ParsedBackupModelIds {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  return parseBackupModelIds(parts);
}

/** The backups worth trying: allowed by the server and not the model that failed. */
export function usableBackupModelIds(
  backups: readonly string[] | undefined,
  failedModel: string | undefined,
  env: Record<string, string | undefined>,
): string[] {
  return (backups ?? []).filter(
    (id) => id !== failedModel && isModelAllowed(env, id),
  );
}
