"use client";

import { useRef, useState } from "react";
import type { BotProfile } from "../bots/bot-types.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import {
  describeBotTemplateError,
  describeFileTextNotice,
  getBotTemplateFileCopy,
} from "./bot-template-file-copy.ts";
import type { BotTemplateDraft } from "./bot-template-file-types.ts";
import {
  botTemplateFileName,
  buildBotTemplateFile,
} from "./build-bot-template-file.ts";
import { parseBotTemplateFile } from "./parse-bot-template-file.ts";

const BUTTON =
  "min-h-11 self-start rounded-full border border-border bg-surface px-5 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] md:text-sm";

function downloadJson(fileName: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function BotTemplateExport({
  bot,
  language,
}: {
  bot: BotProfile;
  language: ChatLanguage;
}) {
  const c = getBotTemplateFileCopy(language);
  const [done, setDone] = useState(false);

  function handleExport() {
    downloadJson(botTemplateFileName(bot.name), buildBotTemplateFile(bot));
    setDone(true);
  }

  return (
    <section className="flex flex-col gap-1.5">
      <button type="button" onClick={handleExport} className={BUTTON}>
        {c.exportAction}
      </button>
      <p className="text-[13px] text-subtle" role="status">
        {done ? c.exported : c.exportHint}
      </p>
    </section>
  );
}

export function BotTemplateImport({
  language,
  onImport,
}: {
  language: ChatLanguage;
  onImport: (draft: BotTemplateDraft) => void;
}) {
  const c = getBotTemplateFileCopy(language);
  const fileInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  // Stays until the form closes: the imported text is the user's to review.
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    setNotice(null);
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setNotice({ kind: "error", text: c.readFailed });
      return;
    }
    const result = parseBotTemplateFile(text);
    if (!result.ok) {
      setNotice({
        kind: "error",
        text: describeBotTemplateError(language, result.error),
      });
      return;
    }
    onImport(result.draft);
    setReviewNotice(describeFileTextNotice(language, result.draft));
    setNotice({
      kind: "success",
      text: result.draft.skills.length
        ? `${c.imported} ${c.importedSkills}`
        : c.imported,
    });
  }

  return (
    <section className="flex flex-col gap-1.5">
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        aria-label={c.importFileLabel}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className={BUTTON}
      >
        {c.importAction}
      </button>
      <p
        role={notice?.kind === "error" ? "alert" : "status"}
        className={`text-[13px] ${notice?.kind === "error" ? "text-danger" : "text-subtle"}`}
      >
        {notice?.text ?? c.importHint}
      </p>
      {reviewNotice && (
        <p
          role="status"
          data-testid="file-text-notice"
          className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-[13px] font-medium text-foreground"
        >
          {reviewNotice}
        </p>
      )}
    </section>
  );
}
