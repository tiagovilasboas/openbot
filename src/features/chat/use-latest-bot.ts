import { useEffect, useRef } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";

/**
 * The bot as saved now. A queued turn starts from an older render; it reads
 * the bot from here instead of from its own closure.
 */
export function useLatestBot(activeBot: BotProfile) {
  const latestBotRef = useRef(activeBot);
  useEffect(() => {
    latestBotRef.current = activeBot;
  }, [activeBot]);
  return latestBotRef;
}
