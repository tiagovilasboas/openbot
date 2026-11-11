import type { MessageData } from "../../chat/ChatMessageItem.tsx";

/** Why a call to /api/conversations failed: no answer, or status and code. */
export type SyncFailure =
  { kind: "network" } | { kind: "http"; status: number; error?: string };

export type ThreadResult =
  { ok: true; messages: MessageData[] } | { ok: false; failure: SyncFailure };

export type WriteResult = { ok: true } | { ok: false; failure: SyncFailure };

export interface ConversationsApi {
  get(botId: string): Promise<ThreadResult>;
  /** Replaces the whole thread; an empty list deletes it. */
  put(botId: string, messages: MessageData[]): Promise<WriteResult>;
  remove(botId: string): Promise<WriteResult>;
}

/** One write to a bot's thread on the server. */
export type ThreadOp =
  { kind: "put"; messages: MessageData[] } | { kind: "delete" };
