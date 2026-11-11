import type { BotProfile } from "../bot-types.ts";

/** What GET and PUT /api/bots return. */
export interface BotsServerState {
  bots: BotProfile[];
  activeBotId: string | null;
  mainBotId: string | null;
}

/** What PUT /api/bots takes: the whole list plus the two selections. */
export interface BotsPayload {
  bots: BotProfile[];
  activeBotId: string;
  mainBotId: string;
}

/** Why a call to /api/bots failed: no answer, or the status and error code. */
export type SyncFailure =
  { kind: "network" } | { kind: "http"; status: number; error?: string };

export type ApiResult =
  { ok: true; state: BotsServerState } | { ok: false; failure: SyncFailure };

export interface BotsApi {
  get(): Promise<ApiResult>;
  put(payload: BotsPayload): Promise<ApiResult>;
}

/** The bots the browser holds, when that list can be trusted. */
export interface LocalSnapshot {
  bots: BotProfile[];
  activeBotId: string;
  storedMainBotId: string | null;
}
