"use client";

import { CheckIcon } from "@/shared/ui/FieldIcons.tsx";
import { BotAvatar } from "./BotAvatar.tsx";
import { BOT_TEMPLATES, type BotTemplate } from "./bot-templates.ts";
import { getBotsCopy } from "./bots-copy.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";

export interface BotTemplatePickerProps {
  language: ChatLanguage;
  selectedId?: string | null;
  onSelectTemplate: (template: BotTemplate) => void;
}

export function BotTemplatePicker({
  language,
  selectedId = null,
  onSelectTemplate,
}: BotTemplatePickerProps) {
  const copy = getBotsCopy(language === "pt");

  return (
    <section
      aria-labelledby="bot-templates-label"
      className="flex flex-col gap-2"
    >
      <div>
        <h3
          id="bot-templates-label"
          className="text-[15px] font-medium text-foreground md:text-sm"
        >
          {copy.templatesLabel}
        </h3>
        <p className="text-[13px] text-subtle">{copy.templatesHint}</p>
      </div>
      <ul className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
        {BOT_TEMPLATES.map((tmpl) => {
          const selected = tmpl.id === selectedId;
          return (
            <li key={tmpl.id} className="w-60 shrink-0 snap-start md:w-auto">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectTemplate(tmpl)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-start transition-[background-color,transform] duration-[140ms] active:scale-[0.97] ${
                  selected
                    ? "border-border bg-surface-tertiary"
                    : "border-border bg-surface hover:bg-surface-secondary"
                }`}
              >
                <BotAvatar
                  shape={tmpl.avatarShape}
                  color={tmpl.avatarColor}
                  size={38}
                  className="shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-foreground md:text-sm">
                    {tmpl.name}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {tmpl.title}
                  </span>
                </span>
                {selected && (
                  <CheckIcon className="size-4 shrink-0 text-foreground" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
