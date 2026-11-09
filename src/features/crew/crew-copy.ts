import type { ChatLanguage } from "../chat/respond-to-message.ts";

/** Prompt and UI text for the Chief's crew, in both supported languages. */
export const crewCopy: Record<
  ChatLanguage,
  {
    rosterHeader: string;
    noSkills: string;
  }
> = {
  pt: {
    rosterHeader:
      "Sua equipe (outros bots que você conhece e pode acionar pelo nome):",
    noSkills: "sem skills",
  },
  en: {
    rosterHeader: "Your crew (other bots you know and can call by name):",
    noSkills: "no skills",
  },
};
