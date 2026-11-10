import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

/**
 * Puts the caret in the composer once the next render has restored its text.
 * The composer owns its textarea, so it is found by its accessible name.
 */
export function focusComposer(language: ChatLanguage): void {
  const label = chatCopy[language].composerLabel;
  window.setTimeout(() => {
    const textareas = document.querySelectorAll("textarea");
    for (const textarea of textareas) {
      if (textarea.getAttribute("aria-label") !== label) continue;
      textarea.focus();
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
      return;
    }
  }, 0);
}
