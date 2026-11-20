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
import { buildInstallLink } from "./install-link.ts";
import { getInstallLinkCopy } from "./install-link-copy.ts";

/** Button and its hint side by side, so the pair costs one row. */
const ROW = "flex items-center gap-3";
const HINT = "min-w-0 flex-1 text-xs md:text-[13px]";
const BUTTON =
  "min-h-9 shrink-0 self-start whitespace-nowrap rounded-full border border-border bg-overlay px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97]";

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
  const linkCopy = getInstallLinkCopy(language);
  const [done, setDone] = useState<"file" | "link" | "link_failed" | null>(
    null,
  );

  function handleExport() {
    downloadJson(botTemplateFileName(bot.name), buildBotTemplateFile(bot));
    setDone("file");
  }

  async function handleCopyLink() {
    const link = buildInstallLink(
      window.location.href,
      JSON.stringify(buildBotTemplateFile(bot)),
    );
    try {
      await navigator.clipboard.writeText(link);
      setDone("link");
    } catch {
      setDone("link_failed");
    }
  }

  const status =
    done === "file"
      ? c.exported
      : done === "link"
        ? linkCopy.linkCopied
        : done === "link_failed"
          ? linkCopy.linkFailed
          : c.exportHint;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleExport} className={BUTTON}>
          {c.exportAction}
        </button>
        <button
          type="button"
          onClick={() => void handleCopyLink()}
          className={BUTTON}
        >
          {linkCopy.copyLink}
        </button>
      </div>
      <p className={`${HINT} text-subtle`} role="status">
        {status}
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
    <section className="flex flex-col gap-2">
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
      <div className={ROW}>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className={BUTTON}
        >
          {c.importAction}
        </button>
        <p
          role={notice?.kind === "error" ? "alert" : "status"}
          className={`${HINT} ${notice?.kind === "error" ? "text-danger" : "text-subtle"}`}
        >
          {notice?.text ?? c.importHint}
        </p>
      </div>
      {reviewNotice && (
        <p
          role="status"
          data-testid="file-text-notice"
          className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-xs md:text-[13px] font-medium text-foreground"
        >
          {reviewNotice}
        </p>
      )}
    </section>
  );
}
