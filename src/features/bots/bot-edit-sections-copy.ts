import type { Language } from "../language/language.ts";

/** Titles of the collapsed groups in the bot editor. */
interface BotEditSectionsCopy {
  advancedModel: string;
  moreOptions: string;
}

const BOT_EDIT_SECTIONS_COPY: Record<Language, BotEditSectionsCopy> = {
  pt: {
    advancedModel: "Opções avançadas do modelo",
    moreOptions: "Mais opções",
  },
  en: {
    advancedModel: "Advanced model options",
    moreOptions: "More options",
  },
  es: {
    advancedModel: "Opciones avanzadas del modelo",
    moreOptions: "Más opciones",
  },
};

export function getBotEditSectionsCopy(
  language: Language,
): BotEditSectionsCopy {
  return BOT_EDIT_SECTIONS_COPY[language];
}
