import { useState } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";

/** Which bot the edit modal shows; no bot means a new one is being made. */
export function useBotEditor() {
  const [botToEdit, setBotToEdit] = useState<BotProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return {
    botToEdit,
    isOpen,
    openNew: () => {
      setBotToEdit(null);
      setIsOpen(true);
    },
    openFor: (bot: BotProfile) => {
      setBotToEdit(bot);
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
      setBotToEdit(null);
    },
  };
}
