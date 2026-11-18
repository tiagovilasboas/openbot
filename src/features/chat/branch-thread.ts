import type { MessageData } from "./ChatMessageItem.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

export type BranchBlock = "running" | "unfinished";

/**
 * Why a reply cannot be branched from, or null when it can. Only a finished
 * assistant answer is a turn boundary: a streaming turn, a failed reply and a
 * cut-off partial all end somewhere the user cannot continue from.
 */
export function branchBlock(
  message: MessageData,
  turnRunning: boolean,
): BranchBlock | null {
  if (message.role !== "assistant") return "unfinished";
  if (message.failure || message.incomplete) return "unfinished";
  return turnRunning ? "running" : null;
}

export interface BranchedThread {
  /** A copy of every message up to and including the chosen reply. */
  messages: MessageData[];
}

/**
 * Copies the thread up to and including one completed assistant reply, for a
 * new conversation. The copies get fresh sequential ids and drop the send ids,
 * so a retry in the branch never collides with the original. The input is not
 * modified. Unknown ids and blocked replies cannot be branched.
 */
export function branchThread(
  messages: MessageData[],
  messageId: number,
  turnRunning = false,
): BranchedThread | null {
  const index = messages.findIndex((m) => m.id === messageId);
  if (index === -1 || branchBlock(messages[index], turnRunning)) return null;
  return {
    messages: messages.slice(0, index + 1).map((m, i) => {
      const { clientId: _clientId, ...rest } = structuredClone(m);
      return { ...rest, id: i + 1 };
    }),
  };
}

const TITLE_SUFFIX: Record<ChatLanguage, string> = {
  pt: "(ramo)",
  en: "(branch)",
  es: "(rama)",
};

/** The branch's title: the original's, plus a marker in the user's language. */
export function branchTitle(original: string, language: ChatLanguage): string {
  const base = original.trim();
  return base ? `${base} ${TITLE_SUFFIX[language]}` : TITLE_SUFFIX[language];
}
