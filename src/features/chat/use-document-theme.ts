import { useEffect } from "react";
import { botAccent } from "@/features/bots/bot-accent.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { HTML_LANG } from "@/features/language/language.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

/** Puts the language and the active accent of the bot on the root element. */
export function useDocumentTheme(
  language: ChatLanguage,
  activeBot: BotProfile,
) {
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[language];
  }, [language]);

  // The active bot's accent drives focus rings, caret, selection and the
  // bot's own chrome, including portaled sheets, so it lives on the root.
  const activeAccent = botAccent(activeBot.avatarColor);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bot-accent", activeAccent);
    return () => {
      root.style.removeProperty("--bot-accent");
    };
  }, [activeAccent]);
}
