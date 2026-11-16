"use client";

import { useEffect, useState } from "react";
import {
  loadBotMessages,
  subscribeBotMessages,
} from "../chat/use-bot-messages.ts";
import { lastReplyFailed } from "./needs-you.ts";

const NONE: ReadonlySet<string> = new Set();

/** The bots whose saved thread ends in a failed reply, kept up to date. */
export function useFailedBots(botIds: readonly string[]): ReadonlySet<string> {
  const [failed, setFailed] = useState<ReadonlySet<string>>(NONE);
  const key = botIds.join("\n");

  useEffect(() => {
    const ids = key ? key.split("\n") : [];
    const refresh = () => {
      const next = new Set(
        ids.filter((id) => lastReplyFailed(loadBotMessages(id))),
      );
      setFailed((prev) =>
        prev.size === next.size && [...next].every((id) => prev.has(id))
          ? prev
          : next,
      );
    };
    refresh();
    const unsubscribes = ids.map((id) => subscribeBotMessages(id, refresh));
    return () => unsubscribes.forEach((off) => off());
  }, [key]);

  return failed;
}
