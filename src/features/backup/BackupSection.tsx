"use client";

import { useRef, useState } from "react";
import { AlertIcon, CheckIcon } from "@/shared/ui/FieldIcons.tsx";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { describeBackupError, getBackupCopy } from "./backup-copy.ts";
import { downloadBackupFile } from "./backup-file.ts";
import type { Backup, RestoreMode } from "./backup-types.ts";
import { summarizeBackup } from "./build-backup.ts";
import { parseBackup } from "./parse-backup.ts";
import { botsSyncMessage } from "../bots/sync/bots-sync-copy.ts";
import { botsSyncErrorCode } from "../bots/sync/bots-sync-failure.ts";
import { pushRestoredBackup } from "../bots/sync/browser-bots-sync.ts";
import { pushRestoredLanguage } from "../settings/sync/browser-settings-sync.ts";
import { restoreBackup } from "./restore-backup.ts";

const BUTTON =
  "min-h-11 rounded-full px-5 text-[15px] font-semibold transition-opacity hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:text-sm";
const PRIMARY = `${BUTTON} bg-foreground text-background`;
const SECONDARY = `${BUTTON} border border-border text-foreground`;

type Notice = { kind: "error" | "success"; text: string } | null;

export function BackupSection({ language }: { language: ChatLanguage }) {
  const c = getBackupCopy(language);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [mode, setMode] = useState<RestoreMode>("merge");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  function handleExport() {
    downloadBackupFile(language);
    setNotice({ kind: "success", text: c.exported });
  }

  async function handleFile(file: File | undefined) {
    setNotice(null);
    setPending(null);
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setNotice({ kind: "error", text: c.readFailed });
      return;
    }
    const result = parseBackup(text);
    if (!result.ok) {
      setNotice({
        kind: "error",
        text: describeBackupError(language, result.error),
      });
      return;
    }
    setPending(result.backup);
  }

  async function handleConfirm() {
    if (!pending) return;
    setBusy(true);
    try {
      restoreBackup(pending, window.localStorage, mode);
    } catch {
      setBusy(false);
      setNotice({ kind: "error", text: c.restoreFailed });
      return;
    }
    // The server holds the bots now, so the restored list goes there too;
    // if it is refused, the next load retries it from this browser.
    pushRestoredLanguage();
    const failure = await pushRestoredBackup();
    const code = failure && botsSyncErrorCode(failure);
    setNotice(
      code
        ? { kind: "error", text: botsSyncMessage(language, code) }
        : { kind: "success", text: c.restored },
    );
    // App state is cached in memory: a reload is the one way to re-read it all.
    window.setTimeout(() => window.location.reload(), code ? 2500 : 900);
  }

  function handleCancel() {
    setPending(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const summary = pending ? summarizeBackup(pending) : null;

  return (
    <section
      aria-labelledby="backup-title"
      className="flex flex-col gap-4 border-t border-border pt-6"
    >
      <div>
        <h3 id="backup-title" className="text-[15px] font-semibold">
          {c.title}
        </h3>
        <p className="text-[13px] text-subtle">{c.description}</p>
        <p className="mt-1 text-[13px] text-subtle">{c.secretsNote}</p>
      </div>

      <div role="status" aria-live="polite" className="empty:hidden">
        {notice && (
          <p
            role={notice.kind === "error" ? "alert" : undefined}
            className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px] ${
              notice.kind === "error"
                ? "bg-danger-soft text-danger"
                : "bg-success-soft text-success"
            }`}
          >
            {notice.kind === "error" ? (
              <AlertIcon className="mt-0.5 size-4 shrink-0" />
            ) : (
              <CheckIcon className="mt-0.5 size-4 shrink-0" />
            )}
            {notice.text}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <button type="button" onClick={handleExport} className={PRIMARY}>
          {c.exportAction}
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className={SECONDARY}
        >
          {c.importAction}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          aria-label={c.importFileLabel}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      {pending && summary && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
          <p className="text-[15px] font-medium">
            {c.summary
              .replace("{bots}", String(summary.bots))
              .replace("{conversations}", String(summary.conversations))}
          </p>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[13px] text-subtle">
              {c.modeLegend}
            </legend>
            {(["merge", "replace"] as const).map((option) => (
              <label
                key={option}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <input
                  type="radio"
                  name="backup-mode"
                  value={option}
                  checked={mode === option}
                  onChange={() => setMode(option)}
                  className="mt-1 size-4"
                />
                <span className="flex flex-col">
                  <span className="text-[15px] font-medium">
                    {option === "merge" ? c.modeMerge : c.modeReplace}
                  </span>
                  <span className="text-[13px] text-subtle">
                    {option === "merge" ? c.modeMergeHint : c.modeReplaceHint}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-2 md:flex-row md:justify-end">
            <button type="button" onClick={handleCancel} className={SECONDARY}>
              {c.cancel}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={busy}
              className={PRIMARY}
            >
              {busy
                ? c.restoring
                : mode === "merge"
                  ? c.confirmMerge
                  : c.confirmReplace}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
