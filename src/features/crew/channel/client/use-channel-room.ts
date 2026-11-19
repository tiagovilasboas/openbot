"use client";

import { useCallback, useEffect, useState } from "react";
import { inChannelOrder, type ChannelMessage } from "../channel-message.ts";
import { fetchChannelMessages, postChannelMessage } from "./channels-api.ts";

/** One channel's stored messages and a way to post to it. */
export function useChannelRoom(channelId: string) {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchChannelMessages(channelId).then((result) => {
      if (!live) return;
      if (result.ok) setMessages(result.value);
      else setError(result.error);
    });
    return () => {
      live = false;
    };
  }, [channelId]);

  /** Posts and waits for the crew; true when the post went through. */
  const post = useCallback(
    async (text: string): Promise<boolean> => {
      setBusy(true);
      setError(null);
      const result = await postChannelMessage(channelId, text);
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setMessages((current) => {
        const known = new Set(current.map((m) => m.seq));
        const added = result.value.filter((m) => !known.has(m.seq));
        return inChannelOrder([...current, ...added]);
      });
      return true;
    },
    [channelId],
  );

  return { messages, error, busy, post };
}
