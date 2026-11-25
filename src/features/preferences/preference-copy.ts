import type { Language } from "../language/language.ts";

interface PreferenceCopy {
  prompt: string;
  save: string;
  dismiss: string;
  failed: string;
}

/** Copy for the learned-preference chip. Bilingual parity. */
export const preferenceCopy: Record<Language, PreferenceCopy> = {
  pt: {
    prompt: "Salvar como preferência?",
    save: "Salvar",
    dismiss: "Agora não",
    failed: "Não foi possível salvar: a memória está cheia.",
  },
  en: {
    prompt: "Save as a preference?",
    save: "Save",
    dismiss: "Not now",
    failed: "Could not save: the memory is full.",
  },
  es: {
    prompt: "¿Guardar como preferencia?",
    save: "Guardar",
    dismiss: "Ahora no",
    failed: "No se pudo guardar: la memoria está llena.",
  },
};
