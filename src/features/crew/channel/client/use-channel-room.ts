"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PauseReply } from "../../../tools/client/paused-turn.ts";
import { inChannelOrder, type ChannelMessage } from "../channel-message.ts";
import {
  fetchChannelMessages,
  postChannelMessage,
  resolveApproval,
  stopChannel,
  type ChannelRoomSnapshot,
} from "./channels-api.ts";

/** How often the room looks for new answers while the group is answering. */
export const ROOM_POLL_MS = 1_200;

function merge(current: ChannelMessage[], incoming: ChannelMessage[]) {
  const known = new Set(current.map((m) => m.seq));
  return inChannelOrder([
    ...current,
    ...incoming.filter((m) => !known.has(m.seq)),
  ]);
}

/**
 * One group's messages, live: while someone answers the room polls, so each
 * answer shows up as soon as it is stored. Post, reply and stop.
 */
export function useChannelRoom(channelId: string, parentSeq?: number) {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [threadCounts, setThreadCounts] = useState<Record<number, number>>({});
  const [turn, setTurn] = useState<ChannelRoomSnapshot["turn"]>(null);
  const [approval, setApproval] =
    useState<ChannelRoomSnapshot["approval"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const live = useRef(true);

  const apply = useCallback(
    (result: Awaited<ReturnType<typeof fetchChannelMessages>>) => {
      if (!live.current) return;
      if (!result.ok) {
        setError(result.error);
        setWaiting(false);
        return;
      }
      setMessages((current) => merge(current, result.value.messages));
      if (!parentSeq) setThreadCounts(result.value.threadCounts);
      setTurn(result.value.turn);
      setApproval(result.value.approval);
      if (!result.value.turn) setWaiting(false);
    },
    [parentSeq],
  );

  const refresh = useCallback(
    () => fetchChannelMessages(channelId, parentSeq).then(apply),
    [channelId, parentSeq, apply],
  );

  useEffect(() => {
    live.current = true;
    void fetchChannelMessages(channelId, parentSeq).then(apply);
    return () => {
      live.current = false;
    };
  }, [channelId, parentSeq, apply]);

  const answering = waiting || turn !== null;
  useEffect(() => {
    if (!answering) return;
    const timer = setInterval(() => void refresh(), ROOM_POLL_MS);
    return () => clearInterval(timer);
  }, [answering, refresh]);

  /** Posts; true when the post went through. */
  const post = useCallback(
    async (text: string, replyToSeq?: number): Promise<boolean> => {
      setSending(true);
      setError(null);
      const result = await postChannelMessage(
        channelId,
        text,
        replyToSeq,
        parentSeq,
      );
      setSending(false);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setMessages((current) => merge(current, result.value));
      setWaiting(true);
      return true;
    },
    [channelId, parentSeq],
  );

  const stop = useCallback(async () => {
    const result = await stopChannel(channelId);
    if (!result.ok) setError(result.error);
    setWaiting(false);
    await refresh();
  }, [channelId, refresh]);

  /** Answers the waiting tool call; the member goes on, then the rest. */
  const decide = useCallback(
    async (reply: PauseReply) => {
      if (!approval) return;
      const result = await resolveApproval(channelId, approval.pause, reply);
      if (!result.ok) setError(result.error);
      else setWaiting(true);
      setApproval(null);
      await refresh();
    },
    [approval, channelId, refresh],
  );

  return {
    approval,
    decide,
    messages,
    threadCounts,
    refresh,
    error,
    sending,
    answering,
    speakingBotId: turn?.speakingBotId ?? null,
    post,
    stop,
  };
}
