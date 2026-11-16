import { useCallback, useEffect, useState } from "react";
import type { Language } from "../language/language.ts";
import { fillCopy } from "../model/settings-copy.ts";
import type { BotProfile } from "./bot-types.ts";
import { getBotModelPickerCopy } from "./bot-model-picker-copy.ts";
import {
  pendingBotModel,
  type InFlightTurnModel,
} from "./pending-bot-model.ts";

const NOTICE_MS = 4000;

/**
 * Open state and saving for the chat's model picker. A choice only edits the
 * bot's `modelId`; a reply already streaming keeps its model and the next
 * turn reads the saved one. While a turn of the bot runs on another model, the
 * choice is `pending` until that turn is over.
 */
export function useBotModelPicker(
  bot: BotProfile,
  language: Language,
  saveBot: (bot: BotProfile) => void,
  turnModel: InFlightTurnModel | null = null,
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
      const waits =
        pendingBotModel({ id: bot.id, modelId }, turnModel) !== null;
      setNotice(
        modelId
          ? fillCopy(waits ? copy.pendingTo : copy.changedTo, {
              name: bot.name,
              model: modelId,
            })
          : fillCopy(waits ? copy.pendingToDefault : copy.changedToDefault, {
              name: bot.name,
            }),
      );
      setIsOpen(false);
    },
    [bot, language, saveBot, turnModel],
  );

  return {
    pending: pendingBotModel(bot, turnModel),
    isOpen,
    notice,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    choose,
  };
}
