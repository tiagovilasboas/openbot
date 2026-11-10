import type { ChatLanguage } from "../chat/respond-to-message.ts";
import type { BotTemplateErrorCode } from "./bot-template-file-types.ts";

/** Copy for exporting and importing one bot. Bilingual parity. */
const copy = {
  pt: {
    exportAction: "Exportar este bot",
    exportHint:
      "O arquivo leva nome, instruções, visual, skills e o modelo do bot, se houver. Não leva conversas, chaves nem senha.",
    exported: "Arquivo do bot baixado.",
    importAction: "Importar de um arquivo",
    importHint:
      "Preenche o formulário com um bot exportado. Você revisa antes de salvar.",
    importFileLabel: "Arquivo de bot do OpenBot",
    imported: "Bot carregado no formulário. Revise e salve.",
    importedSkills:
      "As skills vieram de um arquivo e ficam marcadas como importadas.",
    readFailed: "Não foi possível ler o arquivo. Tente novamente.",
    fileTextNotice:
      "Este texto veio de um arquivo: leia antes de salvar. {count} caracteres de instruções.",
    errors: {
      invalid_file: "Esse arquivo não parece um bot do OpenBot.",
      not_a_template:
        "Esse é um backup completo. Para ele, use Configurações, Backup.",
      unsupported_version:
        "Esse arquivo vem de uma versão que este OpenBot não entende.",
      too_large: "Esse arquivo é grande demais. O limite é 256 KB.",
    },
  },
  en: {
    exportAction: "Export this bot",
    exportHint:
      "The file carries the name, instructions, look, skills and the bot's model, if any. It has no chats, keys or password.",
    exported: "Bot file downloaded.",
    importAction: "Import from a file",
    importHint:
      "Fills the form with an exported bot. You review it before saving.",
    importFileLabel: "OpenBot bot file",
    imported: "Bot loaded into the form. Review it and save.",
    importedSkills: "The skills came from a file and stay marked as imported.",
    readFailed: "Could not read the file. Try again.",
    fileTextNotice:
      "This text came from a file: read it before saving. {count} characters of instructions.",
    errors: {
      invalid_file: "That file does not look like an OpenBot bot.",
      not_a_template: "That is a full backup. For it, use Settings, Backup.",
      unsupported_version:
        "That file comes from a version this OpenBot does not understand.",
      too_large: "That file is too large. The limit is 256 KB.",
    },
  },
} as const;

export function getBotTemplateFileCopy(language: ChatLanguage) {
  return copy[language];
}

/** The characters of instructions an imported file puts in the form. */
export function importedInstructionLength(draft: {
  description: string;
  workspaceContext?: string;
}): number {
  return draft.description.length + (draft.workspaceContext?.length ?? 0);
}

/** The warning shown while a form holds text that came from a file. */
export function describeFileTextNotice(
  language: ChatLanguage,
  draft: { description: string; workspaceContext?: string },
): string {
  return copy[language].fileTextNotice.replace(
    "{count}",
    String(importedInstructionLength(draft)),
  );
}

export function describeBotTemplateError(
  language: ChatLanguage,
  code: BotTemplateErrorCode,
): string {
  return copy[language].errors[code];
}
