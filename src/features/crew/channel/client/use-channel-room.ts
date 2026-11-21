"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { inChannelOrder, type ChannelMessage } from "../channel-message.ts";
import {
  fetchChannelMessages,
  postChannelMessage,
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
export function useChannelRoom(channelId: string) {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [turn, setTurn] = useState<ChannelRoomSnapshot["turn"]>(null);
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
      setTurn(result.value.turn);
      if (!result.value.turn) setWaiting(false);
    },
    [],
  );

  const refresh = useCallback(
    () => fetchChannelMessages(channelId).then(apply),
    [channelId, apply],
  );

  useEffect(() => {
    live.current = true;
    void fetchChannelMessages(channelId).then(apply);
    return () => {
      live.current = false;
    };
  }, [channelId, apply]);

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
      const result = await postChannelMessage(channelId, text, replyToSeq);
      setSending(false);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setMessages((current) => merge(current, result.value));
      setWaiting(true);
      return true;
    },
    [channelId],
  );

  const stop = useCallback(async () => {
    const result = await stopChannel(channelId);
    if (!result.ok) setError(result.error);
    setWaiting(false);
    await refresh();
  }, [channelId, refresh]);

  return {
    messages,
    error,
    sending,
    answering,
    speakingBotId: turn?.speakingBotId ?? null,
    post,
    stop,
  };
}
