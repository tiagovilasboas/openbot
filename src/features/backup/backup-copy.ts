import type { ChatLanguage } from "../chat/respond-to-message.ts";
import type { BackupErrorCode } from "./backup-types.ts";

/** Copy for the backup section of Settings. Bilingual parity. */
export const backupCopy = {
  pt: {
    title: "Backup",
    description:
      "Seus bots e conversas ficam só neste navegador. Exporte um arquivo para guardar uma cópia ou levar para outro lugar.",
    secretsNote:
      "O arquivo não inclui chaves, tokens nem senha. Reconecte seus provedores depois de importar.",
    exportAction: "Exportar backup",
    exported: "Backup baixado.",
    importAction: "Importar backup",
    importFileLabel: "Arquivo de backup do OpenBot",
    summary: "{bots} bots e {conversations} conversas neste arquivo.",
    modeLegend: "Como importar",
    modeMerge: "Mesclar",
    modeMergeHint: "Mantém o que você já tem e adiciona os bots novos.",
    modeReplace: "Substituir",
    modeReplaceHint: "Apaga os bots e conversas atuais e usa os do arquivo.",
    confirmMerge: "Mesclar agora",
    confirmReplace: "Substituir tudo",
    cancel: "Cancelar",
    restoring: "Importando...",
    restored: "Backup importado. Recarregando...",
    errors: {
      invalid_file:
        "Esse arquivo não parece um backup do OpenBot. Escolha outro arquivo.",
      unsupported_version:
        "Esse backup vem de uma versão que este OpenBot não entende.",
      too_large: "Esse arquivo é grande demais. O limite é 5 MB.",
    },
    readFailed: "Não foi possível ler o arquivo. Tente novamente.",
    restoreFailed:
      "Não foi possível guardar o backup neste navegador. Libere espaço e tente de novo.",
  },
  en: {
    title: "Backup",
    description:
      "Your bots and chats live only in this browser. Export a file to keep a copy or take it elsewhere.",
    secretsNote:
      "The file has no keys, tokens or password. Reconnect your providers after importing.",
    exportAction: "Export backup",
    exported: "Backup downloaded.",
    importAction: "Import backup",
    importFileLabel: "OpenBot backup file",
    summary: "{bots} bots and {conversations} conversations in this file.",
    modeLegend: "How to import",
    modeMerge: "Merge",
    modeMergeHint: "Keeps what you have and adds the new bots.",
    modeReplace: "Replace",
    modeReplaceHint: "Erases your current bots and chats and uses the file's.",
    confirmMerge: "Merge now",
    confirmReplace: "Replace everything",
    cancel: "Cancel",
    restoring: "Importing...",
    restored: "Backup imported. Reloading...",
    errors: {
      invalid_file:
        "That file does not look like an OpenBot backup. Choose another file.",
      unsupported_version:
        "That backup comes from a version this OpenBot does not understand.",
      too_large: "That file is too large. The limit is 5 MB.",
    },
    readFailed: "Could not read the file. Try again.",
    restoreFailed:
      "Could not save the backup in this browser. Free some space and try again.",
  },
} as const;

export function getBackupCopy(language: ChatLanguage) {
  return backupCopy[language];
}

export function describeBackupError(
  language: ChatLanguage,
  code: BackupErrorCode,
): string {
  return backupCopy[language].errors[code];
}
