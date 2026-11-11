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
    summary: "{bots} bot(s) e {conversations} conversa(s) neste arquivo.",
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
    summary: "{bots} bot(s) and {conversations} conversation(s) in this file.",
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
  es: {
    title: "Copia de seguridad",
    description:
      "Tus bots y conversaciones viven solo en este navegador. Exporta un archivo para guardar una copia o llevarla a otro lugar.",
    secretsNote:
      "El archivo no incluye claves, tokens ni contraseña. Vuelve a conectar tus proveedores después de importar.",
    exportAction: "Exportar copia",
    exported: "Copia descargada.",
    importAction: "Importar copia",
    importFileLabel: "Archivo de copia de seguridad de OpenBot",
    summary:
      "{bots} bot(s) y {conversations} conversación(es) en este archivo.",
    modeLegend: "Cómo importar",
    modeMerge: "Combinar",
    modeMergeHint: "Conserva lo que ya tienes y agrega los bots nuevos.",
    modeReplace: "Reemplazar",
    modeReplaceHint:
      "Borra tus bots y conversaciones actuales y usa los del archivo.",
    confirmMerge: "Combinar ahora",
    confirmReplace: "Reemplazar todo",
    cancel: "Cancelar",
    restoring: "Importando...",
    restored: "Copia importada. Recargando...",
    errors: {
      invalid_file:
        "Ese archivo no parece una copia de seguridad de OpenBot. Elige otro archivo.",
      unsupported_version:
        "Esa copia viene de una versión que este OpenBot no entiende.",
      too_large: "Ese archivo es demasiado grande. El límite es de 5 MB.",
    },
    readFailed: "No se pudo leer el archivo. Inténtalo de nuevo.",
    restoreFailed:
      "No se pudo guardar la copia en este navegador. Libera espacio e inténtalo de nuevo.",
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
