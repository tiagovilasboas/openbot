"use client";

import { useMemo, useRef, useState } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ClientModelConfig } from "@/features/model/model-config.ts";
import type { ModelCallResult } from "@/features/model/model-status.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import { raceCancel } from "./cancel-turn.ts";
import { cancelledPartialReply } from "./cancelled-partial-reply.ts";
import { chatCopy } from "./chat-copy.ts";
import {
  executeChatMessage,
  type ChatReplyOutcome,
} from "./execute-chat-message.ts";
import { createFrameThrottle } from "./frame-throttle.ts";
import { liveMessages, type LiveEntry } from "./live-board.ts";
import { buildReplyMessages } from "./reply-messages.ts";
import { dropRepliesTo } from "./retry-partial-reply.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { insertReplyAfter, threadUpTo } from "./thread-sequencing.ts";
import { loadBotMessages } from "./use-bot-messages.ts";
import type { QueuedMessage } from "./use-message-queue.ts";
import { workingBotIds } from "./working-bots.ts";

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
  // Replies still arriving. Only the finished or partial reply is stored.
  const [live, setLive] = useState<MessageData[]>([]);
  // The bot that took the message in flight, even if the user moves to another.
  const [turnBotId, setTurnBotId] = useState<string | null>(null);
  const conversationIdRef = useRef(0);
  const turnAbortRef = useRef<AbortController | null>(null);

  async function processTurn(
    turnText: string,
    userMessageId: number,
    conversationId: number,
  ) {
    setBusy(true);
    setTurnBotId(activeBot.id);
    const controller = new AbortController();
    turnAbortRef.current = controller;
    // Deltas repaint at most once per frame; the latest entries are kept
    // aside so a cancel can store exactly what had arrived.
    let latestLive: LiveEntry[] = [];
    let turnActive = true;
    const paint = createFrameThrottle((entries: LiveEntry[]) =>
      setLive(liveMessages(entries, language)),
    );
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
        onLive: (entries) => {
          // After a cancel the abandoned work may still report (a dropped
          // reply, say); what had arrived by then is what gets stored.
          if (!turnActive || controller.signal.aborted) return;
          latestLive = entries;
          paint.push(entries);
        },
        signal: controller.signal,
      }),
    );
    turnActive = false;
    paint.cancel();
    setLive([]);
    if (turnAbortRef.current === controller) turnAbortRef.current = null;
    const reply: ChatReplyOutcome =
      result === "cancelled"
        ? (cancelledPartialReply(latestLive) ?? {
            text: chatCopy[language].cancelledNote,
          })
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
    const stored = loadBotMessages(activeBot.id);
    const message = stored.find(
      (m) => m.id === userMessageId && m.role === "user",
    );
    if (message) {
      // A partial reply is replaced by the new answer, not kept beside it.
      const rest = dropRepliesTo(stored, userMessageId);
      if (rest.length !== stored.length) persistMessages(rest);
      void processTurn(message.text, message.id, conversationIdRef.current);
    }
  }

  function resetConversation() {
    turnAbortRef.current?.abort();
    conversationIdRef.current += 1;
    clearQueue();
    clearMessages();
    setLive([]);
    setBusy(false);
  }

  const workingIds = useMemo(
    () => workingBotIds(busy, turnBotId, workingBot?.id),
    [busy, turnBotId, workingBot],
  );

  return {
    busy,
    liveMessages: live,
    workingBot,
    workingBotIds: workingIds,
    sendText,
    cancelTurn,
    retryMessage,
    resetConversation,
  };
}
