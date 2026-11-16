"use client";

import type { Language } from "../language/language.ts";
import { FormField, FIELD_CLASS } from "@/shared/ui/FormField.tsx";
import {
  BACKUP_MODELS_MAX,
  parseBackupModelsText,
} from "@/features/model/backup-models.ts";
import { getBotsCopy } from "./bots-copy.ts";

/** The bot's backup models, typed as ids split by commas (at most three). */
export function BotBackupModelsField({
  value,
  language,
  onChange,
}: {
  value: string;
  language: Language;
  onChange: (value: string) => void;
}) {
  const copy = getBotsCopy(language);
  const invalid = !parseBackupModelsText(value).ok;

  return (
    <FormField
      label={copy.backupLabel}
      helper={copy.backupHelper}
      error={invalid ? copy.backupInvalid : null}
    >
      {(control) => (
        <input
          {...control}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={copy.backupPlaceholder}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={BACKUP_MODELS_MAX * 101}
          className={FIELD_CLASS}
        />
      )}
    </FormField>
  );
}
