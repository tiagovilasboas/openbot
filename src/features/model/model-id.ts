/** Longest per-call model id the server and the bot sanitizer accept. */
export const MODEL_ID_MAX_LENGTH = 100;

const MODEL_ID_PATTERN = /^[A-Za-z0-9._:/-]+$/;

export type ParsedModelId = { ok: true; modelId?: string } | { ok: false };

/**
 * Reads an optional model id. Absent (undefined) or blank means "use the
 * global model"; anything else must be a short, plain provider model id.
 */
export function parseModelId(raw: unknown): ParsedModelId {
  if (raw === undefined || raw === null) return { ok: true };
  if (typeof raw !== "string") return { ok: false };
  const modelId = raw.trim();
  if (!modelId) return { ok: true };
  if (modelId.length > MODEL_ID_MAX_LENGTH) return { ok: false };
  if (!MODEL_ID_PATTERN.test(modelId)) return { ok: false };
  return { ok: true, modelId };
}

/** Lenient form for stored data: an invalid id is dropped, never kept. */
export function sanitizeModelId(raw: unknown): string | undefined {
  const parsed = parseModelId(raw);
  return parsed.ok ? parsed.modelId : undefined;
}
