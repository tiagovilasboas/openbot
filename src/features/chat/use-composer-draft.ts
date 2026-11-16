"use client";

import { useState } from "react";
import { messageFitsRequest } from "@/features/attachments/request-size.ts";
import { toPayloads } from "@/features/attachments/attachment-summary.ts";
import type { Attachment } from "@/features/attachments/read-attachment.ts";
import type { ComposerAttachments } from "@/features/attachments/use-composer-attachments.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import { focusComposer } from "./focus-composer.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { rollBackThread, type RollbackBlock } from "./roll-back-thread.ts";

interface ComposerDraftInput {
  language: ChatLanguage;
  /** True while the connect gate keeps the composer from sending. */
  locked: boolean;
  attachments: ComposerAttachments;
  messages: MessageData[];
  persistMessages: (next: MessageData[]) => void;
  blockedRollback: RollbackBlock | null;
  sendText: (text: string, files?: Attachment[]) => void;
  resetConversation: () => void;
}

/** The composer's draft text and the actions that send, rewind or clear it. */
export function useComposerDraft({
  language,
  locked,
  attachments,
  messages,
  persistMessages,
  blockedRollback,
  sendText,
  resetConversation,
}: ComposerDraftInput) {
  const [draft, setDraft] = useState("");

  function sendMessage(value = draft) {
    const text = value.trim();
    if (!text || locked) return;
    if (!messageFitsRequest(text, toPayloads(attachments.items))) {
      attachments.reportTooBig();
      return;
    }
    sendText(text, attachments.take());
    setDraft("");
  }

  /** Cuts the thread before a user message and puts its text back to edit. */
  function rollBack(messageId: number) {
    if (blockedRollback) return;
    const result = rollBackThread(messages, messageId);
    if (!result) return;
    persistMessages(result.messages);
    setDraft(result.text);
    focusComposer(language);
  }

  function clearThread() {
    resetConversation();
    setDraft("");
    attachments.clear();
  }

  return { draft, setDraft, sendMessage, rollBack, clearThread };
}
