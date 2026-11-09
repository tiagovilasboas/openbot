/** Free OpenRouter models: what the catalog says, reduced to what can chat. */

export interface FreeModelItem {
  id: string;
  name: string;
  contextLength: number;
  description?: string;
}

export const AUTO_FREE_MODEL: FreeModelItem = {
  id: "openrouter/free",
  name: "OpenRouter: Auto Free Router",
  contextLength: 262144,
  description: "Roteia automaticamente para o melhor modelo gratuito ativo.",
};

const DEFAULT_CONTEXT_LENGTH = 262144;

interface CatalogEntry {
  id?: unknown;
  name?: unknown;
  context_length?: unknown;
  description?: unknown;
  pricing?: { prompt?: unknown; completion?: unknown };
  architecture?: { output_modalities?: unknown };
}

function isZeroPrice(value: unknown): boolean {
  return (
    (typeof value === "string" || typeof value === "number") &&
    Number(value) === 0
  );
}

function writesText(entry: CatalogEntry): boolean {
  const outputs = entry.architecture?.output_modalities;
  return (
    !Array.isArray(outputs) ||
    (outputs.length > 0 && outputs.every((kind) => kind === "text"))
  );
}

function isFree(entry: CatalogEntry, id: string): boolean {
  if (id.endsWith(":free")) return true;
  return (
    isZeroPrice(entry.pricing?.prompt) && isZeroPrice(entry.pricing?.completion)
  );
}

function toItem(entry: CatalogEntry, id: string): FreeModelItem {
  return {
    id,
    name: typeof entry.name === "string" ? entry.name : id,
    contextLength:
      typeof entry.context_length === "number"
        ? entry.context_length
        : DEFAULT_CONTEXT_LENGTH,
    description:
      typeof entry.description === "string" ? entry.description : undefined,
  };
}

/**
 * Reads an OpenRouter `/models` payload and keeps the free models that answer
 * in text only, with the auto free router first. Returns null for an unknown shape.
 * `byPriceToo` also accepts zero-priced ids without the `:free` suffix, which
 * the account endpoint lists for models the key can use at no cost.
 */
export function pickFreeTextModels(
  payload: unknown,
  { byPriceToo = false }: { byPriceToo?: boolean } = {},
): FreeModelItem[] | null {
  const data = (payload as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return null;

  const picked: FreeModelItem[] = [AUTO_FREE_MODEL];
  const seen = new Set([AUTO_FREE_MODEL.id]);
  for (const entry of data as CatalogEntry[]) {
    if (typeof entry?.id !== "string") continue;
    const id = entry.id.trim();
    if (!id || seen.has(id) || !writesText(entry)) continue;
    const free = byPriceToo ? isFree(entry, id) : id.endsWith(":free");
    if (!free) continue;
    seen.add(id);
    picked.push(toItem(entry, id));
  }
  return picked;
}
