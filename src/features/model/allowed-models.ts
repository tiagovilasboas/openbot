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

/**
 * The 400 answer for a model id outside the allow-list, or null when the call
 * may go on. Both chat routes use this one check so they cannot drift apart.
 */
export function modelNotAllowedResponse(
  env: Env,
  modelId: string | undefined,
): Response | null {
  return modelId && !isModelAllowed(env, modelId)
    ? Response.json({ error: "model_not_allowed" }, { status: 400 })
    : null;
}
