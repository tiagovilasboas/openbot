import type { Language } from "../../language/language.ts";
import { botsSyncMessage } from "./bots-sync-copy.ts";
import type { BotsSyncErrorCode } from "./bots-sync-failure.ts";

const DISMISS: Record<Language, string> = {
  pt: "Fechar aviso",
  en: "Dismiss notice",
  es: "Cerrar aviso",
};

interface Props {
  language: Language;
  error: BotsSyncErrorCode | null;
  onDismiss: () => void;
}

/** A short, dismissible notice when the server refused a bot change. */
export function BotsSyncNotice({ language, error, onDismiss }: Props) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2 text-[13px] text-danger"
    >
      <span>{botsSyncMessage(language, error)}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded px-2 py-1 text-muted hover:text-foreground"
      >
        {DISMISS[language]}
      </button>
    </div>
  );
}
