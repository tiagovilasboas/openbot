import type { Language } from "../language/language.ts";

/** Copy for the bot's backup models field. */
interface BackupModelsCopy {
  label: string;
  placeholder: string;
  helper: string;
  invalid: string;
}

const BACKUP_MODELS_COPY: Record<Language, BackupModelsCopy> = {
  pt: {
    label: "Modelos de reserva (opcional)",
    placeholder:
      "ex: google/gemma-4-31b-it:free, nvidia/nemotron-3.5-super-vl:free",
    helper:
      "Até 3 ids separados por vírgula, usados em ordem quando o modelo principal falha ou atinge o limite de uso.",
    invalid:
      "Use até 3 ids de modelo válidos, separados por vírgula (letras, números e . _ : / -).",
  },
  en: {
    label: "Backup models (optional)",
    placeholder:
      "e.g. google/gemma-4-31b-it:free, nvidia/nemotron-3.5-super-vl:free",
    helper:
      "Up to 3 comma-separated ids, tried in order when the main model fails or hits its usage limit.",
    invalid:
      "Use up to 3 valid model ids separated by commas (letters, numbers and . _ : / -).",
  },
  es: {
    label: "Modelos de respaldo (opcional)",
    placeholder:
      "ej.: google/gemma-4-31b-it:free, nvidia/nemotron-3.5-super-vl:free",
    helper:
      "Hasta 3 ids separados por comas, usados en orden cuando el modelo principal falla o alcanza su límite de uso.",
    invalid:
      "Usa hasta 3 ids de modelo válidos separados por comas (letras, números y . _ : / -).",
  },
};

export function getBackupModelsCopy(language: Language): BackupModelsCopy {
  return BACKUP_MODELS_COPY[language];
}
