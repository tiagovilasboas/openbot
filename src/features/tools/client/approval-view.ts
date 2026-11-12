import type { Language } from "../../language/language.ts";
import type { ApprovalPause } from "./tool-stream-events.ts";
import { toolsCopy } from "./tools-copy.ts";

/** "Expires at 14:05", in the user's language and local clock. */
export function expiryText(expiresAt: number, language: Language): string {
  const time = new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(expiresAt));
  return toolsCopy[language].expiresAt.replace("{time}", time);
}

/** "Always allow" is offered when a waiting call's tool allows it. */
export function offersAlways(pause: ApprovalPause): boolean {
  return pause.calls.some((call) => call.allowAlways);
}
