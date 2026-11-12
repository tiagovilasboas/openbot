"use client";

import { useMemo, useRef, useState } from "react";
import {
  recallAttachments,
  rememberAttachments,
} from "@/features/attachments/attachment-stash.ts";
import {
  toPayloads,
  toSummaries,
} from "@/features/attachments/attachment-summary.ts";
import type { AttachmentPayload } from "@/features/attachments/parse-attachments.ts";
import type { Attachment } from "@/features/attachments/read-attachment.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ClientModelConfig } from "@/features/model/model-config.ts";
import { refreshMemoryFromServer } from "@/features/memory/sync/browser-memory-sync.ts";
import type { ModelCallResult } from "@/features/model/model-status.ts";
import type { LiveToolStep } from "@/features/tools/client/live-tool-steps.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import { raceCancel } from "./cancel-turn.ts";
import { cancelledPartialReply } from "./cancelled-partial-reply.ts";
import { historyFromThread } from "@/features/compaction/history-from-thread.ts";
import { useTurnCompaction } from "@/features/compaction/use-turn-compaction.ts";
import { chatCopy } from "./chat-copy.ts";
import {
  executeChatMessage,
  type ChatReplyOutcome,
} from "./execute-chat-message.ts";
import { startLiveTurn } from "./live-turn.ts";
import { buildReplyMessages } from "./reply-messages.ts";
import { dropRepliesTo } from "./retry-partial-reply.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { insertReplyAfter, threadUpTo } from "./thread-sequencing.ts";
import { loadBotMessages } from "./use-bot-messages.ts";
import { useToolApproval } from "./use-tool-approval.ts";
import type { QueuedMessage } from "./use-message-queue.ts";
import { workingBotIds } from "./working-bots.ts";

interface ChatTurnsInput {
  language: ChatLanguage;
  activeBot: BotProfile;
  bots: BotProfile[];
  mainBotId: string;
  gitHubToken: string | null;
  modelConfig: ClientModelConfig | null;
  /** The model whose window the thread is measured against. */
  contextModel: string | undefined;
  /** Shown on replies only when a model is configured. */
  modelBadge: string | undefined;
  recordModelCall: (result?: ModelCallResult) => void;
  persistMessages: (messages: MessageData[]) => void;
  getNextId: () => number;
  clearMessages: () => void;
  enqueue: (item: QueuedMessage) => void;
  dequeue: () => QueuedMessage | undefined;
  clearQueue: () => void;
  /** A bot's reply was stored (not one the user cancelled). */
  onReply: (botId: string) => void;
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
  const [toolSteps, setToolSteps] = useState<LiveToolStep[]>([]);
  const conversationIdRef = useRef(0);
  const turnAbortRef = useRef<AbortController | null>(null);
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
    const turn = beginTurn(activeBot.id);
    const { controller } = turn;
    // A thread filling the window is folded into a summary first; on any
    // failure the turn goes out as it is.
    await compactThread(userMessageId, controller.signal);
    // Read the stored thread, not a render closure, so queued messages stay.
    const history = historyFromThread(
      threadUpTo(loadBotMessages(activeBot.id), userMessageId),
    );

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
        attachments,
        onBotWorking: setWorkingBot,
        onLive: turn.live,
        onToolSteps: turn.steps,
        onMemoryChanged: (botId) => void refreshMemoryFromServer(botId),
        signal: controller.signal,
      }),
    );
    turn.end();
    const reply: ChatReplyOutcome =
      result === "cancelled"
        ? (cancelledPartialReply(turn.latest()) ?? {
            text: chatCopy[language].cancelledNote,
          })
        : result;
    recordModelCall(reply.modelCall);

    if (conversationIdRef.current === conversationId) {
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
      if (reply.toolPause) {
        approval.hold(
          reply.toolPause,
          replyMessages[replyMessages.length - 1].id,
        );
      }
      if (result !== "cancelled") onReply(activeBot.id);
    }
    // If another message was queued in the meantime, it is answered next.
    settleTurn(activeBot.id, conversationId);
  }

  /** Stores the user's message and answers it now, or queues it while busy. */
  function sendText(text: string, files: Attachment[] = []) {
    const conversationId = conversationIdRef.current;
    const userMsgId = getNextId();
    const attachments = toPayloads(files);
    rememberAttachments(activeBot.id, userMsgId, attachments);
    const userMessage: MessageData = {
      id: userMsgId,
      role: "user",
      language,
      text,
      ...(files.length > 0 ? { attachments: toSummaries(files) } : {}),
    };
    persistMessages([...loadBotMessages(activeBot.id), userMessage]);

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
    const stored = loadBotMessages(activeBot.id);
    const message = stored.find(
      (m) => m.id === userMessageId && m.role === "user",
    );
    if (message) {
      // A partial reply is replaced by the new answer, not kept beside it.
      const rest = dropRepliesTo(stored, userMessageId);
      if (rest.length !== stored.length) persistMessages(rest);
      // The file text is not stored: a retry sends it only while it is still
      // in memory from this session.
      void processTurn(
        message.text,
        message.id,
        conversationIdRef.current,
        message.attachments?.length
          ? recallAttachments(activeBot.id, message.id)
          : [],
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
    /** The tool calls of the turn in flight, for the activity line. */
    toolSteps,
    /** A tool turn waiting for the user's approval, and how to answer it. */
    pausedToolTurn: approval.paused,
    decideToolApproval: approval.decide,
  };
}
