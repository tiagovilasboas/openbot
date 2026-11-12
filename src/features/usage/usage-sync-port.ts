import type { UsageRecord } from "./usage-record.ts";

/**
 * What the usage cache tells whoever mirrors it to the server. The cache
 * stays synchronous; the sync is injected so counting never waits on it.
 */
export interface UsageSyncPort {
  /** The log was saved locally (an empty list included); the server is behind. */
  saved(records: readonly UsageRecord[]): void;
}

let port: UsageSyncPort | null = null;

export function connectUsageSync(next: UsageSyncPort | null): void {
  port = next;
}

export function currentUsageSync(): UsageSyncPort | null {
  return port;
}
