"use client";

import { BotAvatar } from "./BotAvatar.tsx";
import { BOT_TEMPLATES, type BotTemplate } from "./bot-templates.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";

export interface BotTemplatePickerProps {
  language: ChatLanguage;
  onSelectTemplate: (template: BotTemplate) => void;
}

export function BotTemplatePicker({
  language,
  onSelectTemplate,
}: BotTemplatePickerProps) {
  const isPt = language === "pt";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-300">
          {isPt ? "Modelos Pré-definidos (Templates)" : "Pre-defined Templates"}
        </label>
        <span className="text-[10px] font-mono text-cyan-400">
          {BOT_TEMPLATES.length} {isPt ? "arquétipos" : "archetypes"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {BOT_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => onSelectTemplate(tmpl)}
            className="group flex items-start gap-2.5 rounded-xl border border-white/10 bg-zinc-900/60 p-2.5 text-left transition-all hover:border-cyan-500/40 hover:bg-zinc-800/80 active:scale-[0.98]"
          >
            <div className="mt-0.5 shrink-0">
              <BotAvatar
                shape={tmpl.avatarShape}
                color={tmpl.avatarColor}
                size={24}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-xs font-semibold text-zinc-200 group-hover:text-cyan-300">
                  {tmpl.name}
                </span>
                <span className="shrink-0 text-[10px] text-zinc-500 group-hover:text-zinc-400">
                  {isPt ? "Aplicar" : "Apply"}
                </span>
              </div>
              <span className="truncate text-[10px] text-zinc-400">
                {tmpl.title}
              </span>
              <p className="mt-1 line-clamp-1 text-[10px] text-zinc-500">
                {tmpl.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
