import type { Language } from "../language/language.ts";

interface SwUpdateCopy {
  message: string;
  update: string;
}

const COPY: Record<Language, SwUpdateCopy> = {
  pt: { message: "Nova versão disponível", update: "Atualizar" },
  en: { message: "New version available", update: "Update" },
  es: { message: "Nueva versión disponible", update: "Actualizar" },
};

export function getSwUpdateCopy(language: Language): SwUpdateCopy {
  return COPY[language];
}
