type Env = Record<string, string | undefined>;

/** The ids in OPENBOT_ALLOWED_MODELS; null when it is unset or empty. */
export function readAllowedModels(env: Env): ReadonlySet<string> | null {
  const ids = (env.OPENBOT_ALLOWED_MODELS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? new Set(ids) : null;
}

/**
 * Whether a per-call model id may be used. With no allow-list any well-formed
 * id passes; with one, only the listed ids do.
 */
export function isModelAllowed(env: Env, modelId: string): boolean {
  const allowed = readAllowedModels(env);
  return allowed === null || allowed.has(modelId);
}
