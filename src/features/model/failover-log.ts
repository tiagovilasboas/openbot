import type { FailoverInfo } from "./model-adapter.ts";

/** Where a failover note goes; the server console by default. */
export type FailoverSink = (event: string, data: FailoverInfo) => void;

const consoleSink: FailoverSink = (event, data) => console.warn(event, data);

/**
 * Records, on the server, that the configured model did not answer and
 * which one did. `reason` is already a sanitized status and tag; the key,
 * headers, prompt and reply never reach this line.
 */
export function logFailover(
  info: FailoverInfo,
  sink: FailoverSink = consoleSink,
): void {
  sink("model.failover", {
    fromModel: info.fromModel,
    toModel: info.toModel,
    reason: info.reason,
  });
}
