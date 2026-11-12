import { KNOWN_FREE_MODELS } from "../model/free-model-catalog.ts";

/** Used when the model id is unknown: small on purpose, so we warn early. */
export const DEFAULT_CONTEXT_WINDOW_TOKENS = 32_768;

const EXACT_WINDOWS: ReadonlyMap<string, number> = new Map(
  KNOWN_FREE_MODELS.map((m) => [m.id.toLowerCase(), m.contextLength]),
);

/** First match wins; ids are compared lowercase, without a provider prefix. */
const PREFIX_WINDOWS: ReadonlyArray<readonly [string, number]> = [
  ["claude-", 200_000],
  ["gpt-4o", 128_000],
  ["gpt-4.1", 1_000_000],
];

/** The context window, in tokens, of a model id. No network call. */
export function contextWindowFor(model: string | undefined): number {
  const id = (model ?? "").trim().toLowerCase();
  if (!id) return DEFAULT_CONTEXT_WINDOW_TOKENS;
  const exact = EXACT_WINDOWS.get(id);
  if (exact) return exact;
  const bare = id.split("/").pop() ?? id;
  const prefixed = PREFIX_WINDOWS.find(([prefix]) => bare.startsWith(prefix));
  return prefixed ? prefixed[1] : DEFAULT_CONTEXT_WINDOW_TOKENS;
}
