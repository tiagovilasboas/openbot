import type { Language } from "../../language/language.ts";
import type { SettingsSyncErrorCode } from "./settings-sync-failure.ts";
import { settingsSyncMessage } from "./settings-sync-copy.ts";

const DISMISS: Record<Language, string> = {
  pt: "Fechar aviso",
  en: "Dismiss",
  es: "Cerrar aviso",
};

interface Props {
  language: Language;
  error: SettingsSyncErrorCode | null;
  onDismiss: () => void;
}

export function SettingsSyncNotice({ language, error, onDismiss }: Props) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2 text-[13px] text-danger"
    >
      <span>{settingsSyncMessage(language, error)}</span>
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
