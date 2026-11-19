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

/** Templates as one swipeable row of compact cards on phones, a grid from tablet up. */
export function BotTemplatePicker({
  language,
  selectedId = null,
  onSelectTemplate,
}: BotTemplatePickerProps) {
  const copy = getBotsCopy(language);

  return (
    <section
      aria-labelledby="bot-templates-label"
      className="flex flex-col gap-1.5"
    >
      <div>
        <h3
          id="bot-templates-label"
          className="text-sm font-semibold text-foreground"
        >
          {copy.templatesLabel}
        </h3>
        <p className="text-xs text-subtle md:text-[13px]">
          {copy.templatesHint}
        </p>
      </div>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
        {BOT_TEMPLATES.map((tmpl) => {
          const selected = tmpl.id === selectedId;
          return (
            <li key={tmpl.id} className="shrink-0 snap-start md:min-w-0">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectTemplate(tmpl)}
                className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-start transition-[background-color,transform] duration-[140ms] active:scale-[0.97] md:min-h-14 md:gap-3 md:px-3 md:py-2 ${
                  selected
                    ? "border-foreground bg-surface-tertiary"
                    : "border-border bg-surface hover:bg-surface-secondary"
                }`}
              >
                <span className="size-7 shrink-0 md:size-9">
                  <BotAvatar
                    shape={tmpl.avatarShape}
                    color={tmpl.avatarColor}
                    size="100%"
                  />
                </span>
                <span className="min-w-0 flex-1 whitespace-nowrap md:whitespace-normal">
                  <span className="block text-sm font-medium text-foreground">
                    {tmpl.name}
                  </span>
                  <span className="block text-xs text-muted md:text-[13px]">
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
