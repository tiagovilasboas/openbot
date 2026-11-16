import { parseModelId } from "../model/model-id.ts";

export interface ModelChoiceSource {
  id: string;
  name: string;
}

export interface ModelChoice {
  /** The id to save on the bot; empty means "use the Settings model". */
  id: string;
  name: string;
  /** The Settings default row, not a concrete model. */
  isDefault: boolean;
  isCurrent: boolean;
}

/** Strips the "(free)" decoration the provider adds to display names. */
function cleanName(name: string): string {
  return name.replace(/ \(free\)/i, "").replace(/:free$/i, "");
}

/**
 * Rows of the chat's model picker: the Settings default first, then the
 * models the user can use now. A saved id outside the list (typed by hand)
 * still shows, so the current choice is never invisible.
 */
export function buildModelChoices(
  freeModels: ModelChoiceSource[],
  currentId: string | undefined,
  defaultName: string,
): ModelChoice[] {
  const current = currentId?.trim() ?? "";
  const rows: ModelChoice[] = [
    { id: "", name: defaultName, isDefault: true, isCurrent: !current },
  ];
  if (current && !freeModels.some((m) => m.id === current)) {
    rows.push({
      id: current,
      name: current,
      isDefault: false,
      isCurrent: true,
    });
  }
  for (const model of freeModels) {
    rows.push({
      id: model.id,
      name: cleanName(model.name),
      isDefault: false,
      isCurrent: model.id === current,
    });
  }
  return rows;
}

export type CustomModelResult =
  { ok: true; modelId: string } | { ok: false; reason: "empty" | "invalid" };

/** Reads the typed custom id with the same rule as the bot edit form. */
export function readCustomModelId(raw: string): CustomModelResult {
  const parsed = parseModelId(raw);
  if (!parsed.ok) return { ok: false, reason: "invalid" };
  if (!parsed.modelId) return { ok: false, reason: "empty" };
  return { ok: true, modelId: parsed.modelId };
}
