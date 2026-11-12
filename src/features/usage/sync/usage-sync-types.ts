import type {
  SyncFailure,
  WriteResult,
} from "../../conversations/sync/conversations-sync-types.ts";
import type { UsageRecord } from "../usage-record.ts";

export type UsageResult =
  { ok: true; records: UsageRecord[] } | { ok: false; failure: SyncFailure };

export interface UsageApi {
  get(): Promise<UsageResult>;
  /** Replaces the whole log; an empty list clears it. */
  put(records: readonly UsageRecord[]): Promise<WriteResult>;
}
