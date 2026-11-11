import { FORMAT_LOCALE, type Language } from "../language/language.ts";
import {
  MAX_ATTACHMENTS,
  MAX_FILE_BYTES,
  MAX_TOTAL_CHARS,
} from "./attachment-limits.ts";
import type { RejectedFile } from "./add-attachments.ts";
import type { AttachmentRejection } from "./read-attachment.ts";

export type AttachmentLanguage = Language;

/** What the composer tells the person when a file or a send does not work. */
export type AttachmentNotice =
  { kind: "rejected"; files: RejectedFile[] } | { kind: "too_big" };

const maxFileKb = MAX_FILE_BYTES / 1024;
const maxChars: Record<Language, string> = {
  pt: MAX_TOTAL_CHARS.toLocaleString(FORMAT_LOCALE.pt),
  en: MAX_TOTAL_CHARS.toLocaleString(FORMAT_LOCALE.en),
  es: MAX_TOTAL_CHARS.toLocaleString(FORMAT_LOCALE.es),
};

const reasonCopy: Record<
  AttachmentLanguage,
  Record<AttachmentRejection, (name: string) => string>
> = {
  pt: {
    too_large: (name) => `${name}: o arquivo passa de ${maxFileKb} KB.`,
    not_text: (name) =>
      `${name}: só leio arquivos de texto (.txt, .md, .json, .csv, código...).`,
    unreadable: (name) => `${name}: não consegui ler esse arquivo.`,
    too_many: (name) =>
      `${name}: o limite é ${MAX_ATTACHMENTS} arquivos e ${maxChars.pt} caracteres por mensagem.`,
    empty: (name) => `${name}: o arquivo está vazio.`,
  },
  en: {
    too_large: (name) => `${name}: the file is over ${maxFileKb} KB.`,
    not_text: (name) =>
      `${name}: I only read text files (.txt, .md, .json, .csv, code...).`,
    unreadable: (name) => `${name}: I could not read that file.`,
    too_many: (name) =>
      `${name}: the limit is ${MAX_ATTACHMENTS} files and ${maxChars.en} characters per message.`,
    empty: (name) => `${name}: the file is empty.`,
  },
  es: {
    too_large: (name) => `${name}: el archivo supera los ${maxFileKb} KB.`,
    not_text: (name) =>
      `${name}: solo leo archivos de texto (.txt, .md, .json, .csv, código...).`,
    unreadable: (name) => `${name}: no pude leer ese archivo.`,
    too_many: (name) =>
      `${name}: el límite es de ${MAX_ATTACHMENTS} archivos y ${maxChars.es} caracteres por mensaje.`,
    empty: (name) => `${name}: el archivo está vacío.`,
  },
};

export const attachmentCopy = {
  pt: {
    attachLabel: "Anexar arquivo de texto",
    attachHint:
      "Anexar arquivo de texto. O texto é lido no seu aparelho e vai só com esta mensagem.",
    chipsLabel: "Arquivos anexados",
    removeLabel: (name: string) => `Remover ${name}`,
    truncatedNote: "só o começo vai ao modelo",
    sentLabel: "Arquivos enviados com esta mensagem",
    tooBig:
      "A mensagem com os arquivos é grande demais para enviar. Remova um arquivo ou encurte a mensagem.",
  },
  en: {
    attachLabel: "Attach a text file",
    attachHint:
      "Attach a text file. The text is read on your device and goes only with this message.",
    chipsLabel: "Attached files",
    removeLabel: (name: string) => `Remove ${name}`,
    truncatedNote: "only the start goes to the model",
    sentLabel: "Files sent with this message",
    tooBig:
      "The message with its files is too big to send. Remove a file or shorten the message.",
  },
  es: {
    attachLabel: "Adjuntar un archivo de texto",
    attachHint:
      "Adjuntar un archivo de texto. El texto se lee en tu dispositivo y viaja solo con este mensaje.",
    chipsLabel: "Archivos adjuntos",
    removeLabel: (name: string) => `Quitar ${name}`,
    truncatedNote: "solo el inicio llega al modelo",
    sentLabel: "Archivos enviados con este mensaje",
    tooBig:
      "El mensaje con sus archivos es demasiado grande para enviarlo. Quita un archivo o acorta el mensaje.",
  },
} as const;

/** The lines to show for a notice, one per file or one for the send. */
export function describeNotice(
  notice: AttachmentNotice,
  language: AttachmentLanguage,
): string[] {
  if (notice.kind === "too_big") return [attachmentCopy[language].tooBig];
  return notice.files.map(({ name, reason }) =>
    reasonCopy[language][reason](name),
  );
}
