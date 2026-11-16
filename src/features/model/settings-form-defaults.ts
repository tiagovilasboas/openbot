import {
  ANTHROPIC_DEFAULT_MODEL,
  OPENROUTER_FREE_MODEL,
  OPENROUTER_URL,
} from "../connections/copy.ts";

/** What the Model settings form starts on when nothing is saved: the same
 * models a fresh connection selects, so saving untouched fields works. */
export const SETTINGS_FORM_DEFAULTS = {
  routerUrl: OPENROUTER_URL,
  routerModel: OPENROUTER_FREE_MODEL,
  anthropicModel: ANTHROPIC_DEFAULT_MODEL,
} as const;
