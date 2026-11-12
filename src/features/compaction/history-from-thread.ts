import type { MessageData } from "../chat/ChatMessageItem.tsx";
import type { HistoryMessage } from "../chat/request-history.ts";
import {
  externalDataRule,
  wrapExternalText,
} from "../untrusted-text/wrap-external-text.ts";
import { compactionCopy } from "./compaction-copy.ts";

/**
 * The thread as the model sees it. A compacted marker becomes one entry with
 * its summary, wrapped as data because a model wrote it; the archived
 * originals are never sent.
 */
export function historyFromThread(messages: MessageData[]): HistoryMessage[] {
  return messages.map((m) =>
    m.compacted
      ? {
          role: "user",
          text: `${compactionCopy[m.language].summaryPrefix}\n${externalDataRule(m.language)}\n${wrapExternalText(m.text)}`,
        }
      : { role: m.role, text: m.text },
  );
}
