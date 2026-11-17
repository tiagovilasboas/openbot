"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AttachmentPayload } from "@/features/attachments/parse-attachments.ts";
import type { Attachment } from "@/features/attachments/read-attachment.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { InFlightTurnModel } from "@/features/bots/pending-bot-model.ts";
import { refreshMemoryFromServer } from "@/features/memory/sync/browser-memory-sync.ts";
import type { LiveToolStep } from "@/features/tools/client/live-tool-steps.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import {
  clientIdOf,
  isAlreadySent,
  newClientMessageId,
} from "./client-message-id.ts";
import { historyFromThread } from "@/features/compaction/history-from-thread.ts";
import { useTurnCompaction } from "@/features/compaction/use-turn-compaction.ts";
import { startLiveTurn } from "./live-turn.ts";
import { prepareRetry } from "./prepare-retry.ts";
import { runModelTurn } from "./run-model-turn.ts";
import { storeUserMessage } from "./store-user-message.ts";
import { storeTurnReply } from "./store-turn-reply.ts";
import { threadUpTo } from "./thread-sequencing.ts";
import { loadBotMessages } from "./use-bot-messages.ts";
import type { ToolTurnView } from "./tool-turn-view.ts";
import { useToolApproval } from "./use-tool-approval.ts";
import type { ChatTurnsInput } from "./chat-turns-input.ts";
import { workingBotIds } from "./working-bots.ts";

/** Sends the user's text, answers it turn by turn and runs the queue. */
export function useChatTurns(input: ChatTurnsInput) {
  const {
    language,
    activeBot,
    bots,
    mainBotId,
    gitHubToken,
    modelConfig,
    contextModel,
    modelBadge,
    recordModelCall,
    persistMessages,
    getNextId,
    clearMessages,
    enqueue,
    dequeue,
    clearQueue,
    onReply,
  } = input;
  const [busy, setBusy] = useState(false);
  // While the Chief's crew answers, the thinking row follows the working bot.
  const [workingBot, setWorkingBot] = useState<BotProfile | null>(null);
  // Replies still arriving. Only the finished or partial reply is stored.
  const [live, setLive] = useState<MessageData[]>([]);
  // The bot that took the message in flight, even if the user moves to another.
  const [turnBotId, setTurnBotId] = useState<string | null>(null);
  // The model that turn started with; a later pick waits for the next turn.
  const [turnModel, setTurnModel] = useState<InFlightTurnModel | null>(null);
  const [toolSteps, setToolSteps] = useState<LiveToolStep[]>([]);
  // The bot whose last turn ran without tools, for a one-line notice.
  const [unavailableBotId, setUnavailableBotId] = useState<string | null>(null);
  const conversationIdRef = useRef(0);
  const turnAbortRef = useRef<AbortController | null>(null);
  // A queued turn starts from an older render; it reads the bot as saved now.
  const latestBotRef = useRef(activeBot);
  useEffect(() => {
    latestBotRef.current = activeBot;
  }, [activeBot]);
  const compactThread = useTurnCompaction({
    language,
    activeBot,
    modelConfig,
    contextModel,
    persistMessages,
  });

  const beginTurn = (botId: string) =>
    startLiveTurn(
      {
        language,
        abortRef: turnAbortRef,
        setBusy,
        setTurnBotId,
        setLive,
        setToolSteps,
      },
      botId,
    );

  /** The turn is over: free the composer, then answer the next queued one. */
  function settleTurn(botId: string, conversationId: number) {
    setWorkingBot(null);
    setTurnModel(null);
    setBusy(false);
    if (conversationIdRef.current !== conversationId) return;
    const nextQueued = dequeue();
    if (nextQueued && nextQueued.conversationId === conversationIdRef.current) {
      void processTurn(
        nextQueued.text,
        nextQueued.id,
        conversationId,
        nextQueued.attachments,
      );
    }
  }

  const approval = useToolApproval({
    language,
    conversationIdRef,
    beginTurn,
    settleTurn,
    recordModelCall,
  });

  async function processTurn(
    turnText: string,
    userMessageId: number,
    conversationId: number,
    attachments: AttachmentPayload[] = [],
  ) {
    // A new message ends a turn still waiting for approval.
    approval.drop();
    setUnavailableBotId(null);
    const latest = latestBotRef.current;
    const turnBot = latest.id === activeBot.id ? latest : activeBot;
    setTurnModel({ botId: turnBot.id, modelId: turnBot.modelId });
    const turn = beginTurn(turnBot.id);
    const { controller } = turn;
    // A thread filling the window is folded into a summary first; on any
    // failure the turn goes out as it is.
    await compactThread(userMessageId, controller.signal);
    // Read the stored thread, not a render closure, so queued messages stay.
    const history = historyFromThread(
      threadUpTo(loadBotMessages(activeBot.id), userMessageId),
    );

    const { reply, cancelled } = await runModelTurn(turn, {
      text: turnText,
      language,
      history,
      activeBot: turnBot,
      bots,
      mainBotId,
      gitHubToken,
      modelConfig,
      attachments,
      clientMessageId: clientIdOf(loadBotMessages(activeBot.id), userMessageId),
      onBotWorking: setWorkingBot,
      onMemoryChanged: (botId) => void refreshMemoryFromServer(botId),
    });
    recordModelCall(reply.modelCall);

    if (conversationIdRef.current === conversationId) {
      const replyMessages = storeTurnReply({
        reply,
        language,
        modelBadge,
        getNextId,
        thread: loadBotMessages(activeBot.id),
        userMessageId,
        persistMessages,
      });
      if (reply.toolsUnavailable) setUnavailableBotId(activeBot.id);
      if (reply.toolPause) {
        approval.hold(
          reply.toolPause,
          replyMessages[replyMessages.length - 1].id,
        );
      }
      if (!cancelled) onReply(activeBot.id);
    }
    // If another message was queued in the meantime, it is answered next.
    settleTurn(activeBot.id, conversationId);
  }

  /** Stores the user's message and answers it now, or queues it while busy. */
  function sendText(
    text: string,
    files: Attachment[] = [],
    clientId = newClientMessageId(),
  ) {
    // The same send arriving twice is stored and answered once.
    if (isAlreadySent(loadBotMessages(activeBot.id), clientId)) return;
    const conversationId = conversationIdRef.current;
    const userMsgId = getNextId();
    const attachments = storeUserMessage({
      botId: activeBot.id,
      id: userMsgId,
      clientId,
      language,
      text,
      files,
      thread: loadBotMessages(activeBot.id),
      persistMessages,
    });

    if (busy) {
      enqueue({ id: userMsgId, text, conversationId, attachments });
      return;
    }

    void processTurn(text, userMsgId, conversationId, attachments);
  }

  /** Stops the reply in flight; the queue then moves on to the next message. */
  function cancelTurn() {
    turnAbortRef.current?.abort();
  }

  /** Answers a user message left without a reply, e.g. after a reload. */
  function retryMessage(userMessageId: number) {
    if (busy) return;
    const retry = prepareRetry(
      loadBotMessages(activeBot.id),
      userMessageId,
      activeBot.id,
      persistMessages,
    );
    if (retry) {
      void processTurn(
        retry.text,
        retry.id,
        conversationIdRef.current,
        retry.attachments,
      );
    }
  }

  function resetConversation() {
    turnAbortRef.current?.abort();
    conversationIdRef.current += 1;
    clearQueue();
    approval.drop();
    clearMessages();
    setLive([]);
    setTurnModel(null);
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
    turnModel,
    sendText,
    cancelTurn,
    retryMessage,
    resetConversation,
    /** The tool turn as the conversation shows it. */
    toolTurn: {
      paused: approval.paused,
      resumingId: approval.resumingId,
      steps: toolSteps,
      unavailableBotId,
      onDecide: (choice) => void approval.decide(choice),
    } satisfies ToolTurnView,
  };
}
