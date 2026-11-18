import { chatCopyEn } from "./chat-copy-en.ts";
import { chatCopyEs } from "./chat-copy-es.ts";
import { chatCopyPt } from "./chat-copy-pt.ts";

/** The chat shell and settings copy, one dictionary per language. */
export const chatCopy = {
  pt: chatCopyPt,
  en: chatCopyEn,
  es: chatCopyEs,
} as const;
