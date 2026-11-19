"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrewChannel } from "../crew-channel.ts";
import { fetchChannels, putChannel, removeChannel } from "./channels-api.ts";

export type ChannelsState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; channels: CrewChannel[] };

/** The saved crew channels, with save and remove. */
export function useChannels() {
  const [state, setState] = useState<ChannelsState>({ status: "loading" });

  const reload = useCallback(async () => {
    const result = await fetchChannels();
    setState(
      result.ok
        ? { status: "ready", channels: result.value }
        : { status: "failed" },
    );
  }, []);

  useEffect(() => {
    let live = true;
    void fetchChannels().then((result) => {
      if (!live) return;
      setState(
        result.ok
          ? { status: "ready", channels: result.value }
          : { status: "failed" },
      );
    });
    return () => {
      live = false;
    };
  }, []);

  /** Saves a channel; the server's error code on failure, else null. */
  const save = useCallback(
    async (channel: CrewChannel): Promise<string | null> => {
      const result = await putChannel(channel);
      if (!result.ok) return result.error;
      await reload();
      return null;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await removeChannel(id);
      await reload();
    },
    [reload],
  );

  return { state, save, remove };
}
