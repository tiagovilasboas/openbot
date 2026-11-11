"use client";

import { chatCopy } from "./chat-copy.ts";
import { HTML_LANG, LANGUAGES, type Language } from "../language/language.ts";

interface LanguageToggleProps {
  language: Language;
  onChange: (language: Language) => void;
  /** compact: PT/EN/ES pill for the desktop header; full: named, 44px tall. */
  density?: "compact" | "full";
  className?: string;
}

const DENSITY = {
  compact: {
    group: "inline-flex rounded-full p-0.5",
    option: "h-7 rounded-full px-2.5 text-xs font-medium tabular-nums",
  },
  full: {
    group: "grid grid-cols-3 rounded-xl p-0.5",
    option: "h-11 rounded-[10px] px-3 text-[15px] font-medium",
  },
} as const;

export function LanguageToggle({
  language,
  onChange,
  density = "compact",
  className = "",
}: LanguageToggleProps) {
  const content = chatCopy[language];
  const styles = DENSITY[density];
  const names: Record<Language, string> = {
    pt: content.languagePortuguese,
    en: content.languageEnglish,
    es: content.languageSpanish,
  };

  return (
    <div
      role="group"
      aria-label={content.languageLabel}
      className={`border border-border bg-surface ${styles.group} ${className}`}
    >
      {LANGUAGES.map((option) => {
        const isSelected = option === language;
        return (
          <button
            key={option}
            type="button"
            lang={HTML_LANG[option]}
            aria-pressed={isSelected}
            title={density === "compact" ? names[option] : undefined}
            onClick={() => onChange(option)}
            className={`${styles.option} transition-[background-color,color,transform] duration-150 ease-out-expo active:scale-[0.97] ${
              isSelected
                ? "bg-surface-tertiary text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {density === "compact" ? option.toUpperCase() : names[option]}
          </button>
        );
      })}
    </div>
  );
}
