"use client";

import type { Language } from "../language/language.ts";
import { FormField, FIELD_CLASS } from "@/shared/ui/FormField.tsx";
import {
  MODEL_ID_MAX_LENGTH,
  parseModelId,
} from "@/features/model/model-id.ts";
import { getBotsCopy } from "./bots-copy.ts";

/** Whether the typed text can be saved as the bot's model (empty can). */
export function isBotModelIdValid(value: string): boolean {
  return parseModelId(value).ok;
}

/** The bot's own model id. Empty means "use the global model". */
export function BotModelField({
  value,
  language,
  onChange,
}: {
  value: string;
  language: Language;
  onChange: (value: string) => void;
}) {
  const copy = getBotsCopy(language);
  const invalid = !isBotModelIdValid(value);

  return (
    <FormField
      label={copy.modelLabel}
      helper={copy.modelHelper}
      error={invalid ? copy.modelInvalid : null}
    >
      {(control) => (
        <input
          {...control}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={copy.modelPlaceholder}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={MODEL_ID_MAX_LENGTH}
          className={FIELD_CLASS}
        />
      )}
    </FormField>
  );
}
