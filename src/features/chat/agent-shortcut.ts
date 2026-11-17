import type { BotProfile } from "@/features/bots/bot-types.ts";

/** How many agents of the list the keyboard can reach. */
export const AGENT_SHORTCUT_LIMIT = 9;

/** The key event fields that decide a shortcut; a `KeyboardEvent` fits. */
export interface ShortcutKeyEvent {
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat?: boolean;
  isComposing?: boolean;
}

/**
 * Alt (Option on a Mac) plus a digit. The physical key (`code`) is read, since
 * Option+1 types "¡" on a Mac and Alt+Shift changes `key` elsewhere. Ctrl and
 * Cmd plus a digit belong to the browser's tab switch, so they are not used.
 */
export function agentShortcutNumber(event: ShortcutKeyEvent): number | null {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return null;
  }
  if (event.repeat || event.isComposing) return null;
  const match = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
  return match ? Number(match[1]) : null;
}

/** The agent behind slot `number` of the visible list, in the order shown. */
export function agentAtShortcut(
  bots: readonly BotProfile[],
  number: number,
): BotProfile | undefined {
  if (!Number.isInteger(number) || number < 1) return undefined;
  if (number > AGENT_SHORTCUT_LIMIT) return undefined;
  return bots.filter((bot) => !bot.hidden)[number - 1];
}

/** The digit shown on a row of the visible list, or undefined past the ninth. */
export function agentShortcutHint(index: number): string | undefined {
  return index >= 0 && index < AGENT_SHORTCUT_LIMIT
    ? String(index + 1)
    : undefined;
}

/** Marks the app's own chat composer, whatever the language of its label. */
export const COMPOSER_ATTRIBUTE = "data-chat-composer";

/**
 * True where the shortcut must stay out of the way: any field being edited
 * except the chat composer. The shortcut reads the physical key and calls
 * `preventDefault`, so nothing is typed in the composer.
 */
export function shortcutBlockedByTarget(target: EventTarget | null): boolean {
  if (!isTypingTarget(target)) return false;
  const el = target as { hasAttribute?: (name: string) => boolean };
  return !el.hasAttribute?.(COMPOSER_ATTRIBUTE);
}

/** True where a key press belongs to text entry or a control being edited. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as {
    tagName?: string;
    isContentEditable?: boolean;
  } | null;
  if (!el?.tagName) return false;
  if (el.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName.toUpperCase());
}
