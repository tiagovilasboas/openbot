import { useCallback, useEffect, useState } from "react";
import type { Language } from "../language/language.ts";
import { fillCopy } from "../model/settings-copy.ts";
import type { BotProfile } from "./bot-types.ts";
import { getBotModelPickerCopy } from "./bot-model-picker-copy.ts";

const NOTICE_MS = 4000;

/**
 * Open state and saving for the chat's model picker. A choice only edits the
 * bot's `modelId`; a reply already streaming keeps its model and the next
 * turn reads the saved one.
 */
export function useBotModelPicker(
  bot: BotProfile,
  language: Language,
  saveBot: (bot: BotProfile) => void,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const choose = useCallback(
    (modelId: string) => {
      const copy = getBotModelPickerCopy(language);
      const { modelId: _previous, ...rest } = bot;
      saveBot(modelId ? { ...rest, modelId } : rest);
      setNotice(
        modelId
          ? fillCopy(copy.changedTo, { name: bot.name, model: modelId })
          : fillCopy(copy.changedToDefault, { name: bot.name }),
      );
      setIsOpen(false);
    },
    [bot, language, saveBot],
  );

  return {
    isOpen,
    notice,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    choose,
  };
}
