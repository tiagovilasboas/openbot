"use client";

import { useState } from "react";
import type { Language } from "../language/language.ts";
import { BOT_FOLDER_MAX_LENGTH } from "./bot-folders.ts";
import { getBotFolderCopy } from "./bot-folder-copy.ts";

/** Puts the bot in a sidebar folder, or takes it out with an empty name. */
export function BotFolderControl({
  language,
  folder,
  onSave,
}: {
  language: Language;
  folder?: string;
  onSave: (folder: string) => void;
}) {
  const copy = getBotFolderCopy(language);
  const [value, setValue] = useState(folder ?? "");
  const changed = value.trim() !== (folder ?? "");
  return (
    <div className="flex flex-col gap-1.5 py-1.5">
      <label className="text-xs text-muted md:text-[13px]" htmlFor="bot-folder">
        {copy.hint}
      </label>
      <div className="flex items-center gap-2">
        <input
          id="bot-folder"
          value={value}
          maxLength={BOT_FOLDER_MAX_LENGTH}
          placeholder={copy.placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          className="min-h-9 min-w-0 flex-1 rounded-full border border-border bg-surface px-3.5 text-sm"
        />
        <button
          type="button"
          disabled={!changed}
          onClick={() => onSave(value)}
          className="min-h-9 shrink-0 whitespace-nowrap rounded-full border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary disabled:opacity-50"
        >
          {value.trim() ? copy.move : copy.remove}
        </button>
      </div>
    </div>
  );
}
