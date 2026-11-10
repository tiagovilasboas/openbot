"use client";

import { useRef, useState } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ClientModelConfig } from "@/features/model/model-config.ts";
import type { ModelCallResult } from "@/features/model/model-status.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import { raceCancel } from "./cancel-turn.ts";
import { chatCopy } from "./chat-copy.ts";
import {
  executeChatMessage,
  type ChatReplyOutcome,
} from "./execute-chat-message.ts";
import { buildReplyMessages } from "./reply-messages.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { insertReplyAfter, threadUpTo } from "./thread-sequencing.ts";
import { loadBotMessages } from "./use-bot-messages.ts";
import type { QueuedMessage } from "./use-message-queue.ts";

interface ChatTurnsInput {
  language: ChatLanguage;
  activeBot: BotProfile;
  bots: BotProfile[];
  mainBotId: string;
  gitHubToken: string | null;
  modelConfig: ClientModelConfig | null;
  /** Shown on replies only when a model is configured. */
  modelBadge: string | undefined;
  recordModelCall: (result?: ModelCallResult) => void;
  persistMessages: (messages: MessageData[]) => void;
  getNextId: () => number;
  clearMessages: () => void;
  enqueue: (item: QueuedMessage) => void;
  dequeue: () => QueuedMessage | undefined;
  clearQueue: () => void;
}

/** Sends the user's text, answers it turn by turn and runs the queue. */
export function useChatTurns(input: ChatTurnsInput) {
  const {
    language,
    activeBot,
    bots,
    mainBotId,
    gitHubToken,
    modelConfig,
    modelBadge,
    recordModelCall,
    persistMessages,
    getNextId,
    clearMessages,
    enqueue,
    dequeue,
    clearQueue,
  } = input;
  const [busy, setBusy] = useState(false);
  // While the Chief's crew answers, the thinking row follows the working bot.
  const [workingBot, setWorkingBot] = useState<BotProfile | null>(null);
  const conversationIdRef = useRef(0);
  const turnAbortRef = useRef<AbortController | null>(null);

  async function processTurn(
    turnText: string,
    userMessageId: number,
    conversationId: number,
  ) {
    setBusy(true);
    const controller = new AbortController();
    turnAbortRef.current = controller;
    // Read the stored thread, not a render closure, so queued messages stay.
    const history = threadUpTo(
      loadBotMessages(activeBot.id),
      userMessageId,
    ).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    const result = await raceCancel(
      controller.signal,
      executeChatMessage({
        text: turnText,
        language,
        history,
        activeBot,
        bots,
        mainBotId,
        gitHubToken,
        modelConfig,
        onBotWorking: setWorkingBot,
        signal: controller.signal,
      }),
    );
    if (turnAbortRef.current === controller) turnAbortRef.current = null;
    const reply: ChatReplyOutcome =
      result === "cancelled"
        ? { text: chatCopy[language].cancelledNote }
        : result;
    recordModelCall(reply.modelCall);
    setWorkingBot(null);

    if (conversationIdRef.current !== conversationId) {
      setBusy(false);
      return;
    }

    const replyMessages = buildReplyMessages(reply, {
      language,
      modelBadge,
      nextId: getNextId,
    });
    persistMessages(
      insertReplyAfter(
        loadBotMessages(activeBot.id),
        userMessageId,
        replyMessages,
      ),
    );
    setBusy(false);

    // If another message was queued in the meantime, process it sequentially
    const nextQueued = dequeue();
    if (nextQueued && nextQueued.conversationId === conversationIdRef.current) {
      void processTurn(nextQueued.text, nextQueued.id, conversationId);
    }
  }

  /** Stores the user's message and answers it now, or queues it while busy. */
  function sendText(text: string) {
    const conversationId = conversationIdRef.current;
    const userMsgId = getNextId();
    const userMessage: MessageData = {
      id: userMsgId,
      role: "user",
      language,
      text,
    };
    persistMessages([...loadBotMessages(activeBot.id), userMessage]);

    if (busy) {
      enqueue({ id: userMsgId, text, conversationId });
      return;
    }

    void processTurn(text, userMsgId, conversationId);
  }

  /** Stops the reply in flight; the queue then moves on to the next message. */
  function cancelTurn() {
    turnAbortRef.current?.abort();
  }

  /** Answers a user message left without a reply, e.g. after a reload. */
  function retryMessage(userMessageId: number) {
    if (busy) return;
    const message = loadBotMessages(activeBot.id).find(
      (m) => m.id === userMessageId && m.role === "user",
    );
    if (message) {
      void processTurn(message.text, message.id, conversationIdRef.current);
    }
  }

  function resetConversation() {
    turnAbortRef.current?.abort();
    conversationIdRef.current += 1;
    clearQueue();
    clearMessages();
    setBusy(false);
  }

  return {
    busy,
    workingBot,
    sendText,
    cancelTurn,
    retryMessage,
    resetConversation,
  };
}
