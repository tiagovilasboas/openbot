import { useEffect, useRef } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import {
  agentAtShortcut,
  agentShortcutNumber,
  isTypingTarget,
} from "./agent-shortcut.ts";
import { focusComposer } from "./focus-composer.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface AgentShortcutsInput {
  language: ChatLanguage;
  bots: readonly BotProfile[];
  /** The connect-first gate: no agent can be picked while it holds. */
  locked: boolean;
  onSelect: (botId: string) => void;
}

function dialogIsOpen(): boolean {
  return (
    document.querySelector('[role="dialog"], [aria-modal="true"]') !== null
  );
}

/**
 * Alt+1 to Alt+9 switch to the Nth agent of the visible list and move the
 * caret to the composer. Nothing happens while typing in a field, while a
 * dialog (settings, editor, the phone drawer) is open or while the gate locks
 * the agents.
 */
export function useAgentShortcuts(input: AgentShortcutsInput) {
  const latest = useRef(input);
  useEffect(() => {
    latest.current = input;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const number = agentShortcutNumber(event);
      if (number === null || event.defaultPrevented) return;
      const { language, bots, locked, onSelect } = latest.current;
      if (locked || isTypingTarget(event.target) || dialogIsOpen()) return;
      const bot = agentAtShortcut(bots, number);
      if (!bot) return;
      event.preventDefault();
      onSelect(bot.id);
      focusComposer(language);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
