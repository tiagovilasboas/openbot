import type { BotProfile } from "../bots/bot-types.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

/** One reply in progress, shown while its text arrives. */
export interface LiveEntry {
  /** The bot answering when it is not the active one (a specialist). */
  delegatedBot?: BotProfile;
  text: string;
}

/**
 * The replies of one turn as they build up: the ones already complete (the
 * Chief's kickoff, finished specialists) and the one streaming now. Every
 * change emits the whole list; nothing here is stored.
 */
export function createLiveBoard(emit: (entries: LiveEntry[]) => void) {
  const settled: LiveEntry[] = [];
  let current: LiveEntry | null = null;
  const publish = () => emit(current ? [...settled, current] : [...settled]);

  return {
    /** Starts the streaming reply; call the result with the text so far. */
    stream(delegatedBot?: BotProfile): (text: string) => void {
      const entry: LiveEntry = { delegatedBot, text: "" };
      current = entry;
      return (text) => {
        if (current !== entry) return;
        entry.text = text;
        publish();
      };
    },
    /** The streaming reply is complete: it stays and the next one follows. */
    keep() {
      if (current) settled.push(current);
      current = null;
      publish();
    },
    /** The streaming reply is gone; the turn will say what happened. */
    drop() {
      current = null;
      publish();
    },
    /** Replaces the streaming reply with a complete one. */
    settle(text: string, delegatedBot?: BotProfile) {
      current = null;
      settled.push({ text, delegatedBot });
      publish();
    },
  };
}

/** Live entries as chat messages. Negative ids never collide with stored ones. */
export function liveMessages(
  entries: LiveEntry[],
  language: ChatLanguage,
): MessageData[] {
  return entries
    .filter((entry) => entry.text.trim())
    .map((entry, index) => ({
      id: -(index + 1),
      role: "assistant" as const,
      language,
      text: entry.text,
      delegatedBot: entry.delegatedBot,
    }));
}
