import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { backupFileName, buildBackup } from "./build-backup.ts";

/** Builds the backup from this browser's storage and downloads it as JSON. */
export function downloadBackupFile(language: ChatLanguage): void {
  const backup = buildBackup(window.localStorage, language);
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
