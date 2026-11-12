import type { FailoverInfo } from "./model-adapter.ts";
import type { ModelFailureKind } from "./classify-model-failure.ts";
import type { StreamUsage } from "./stream-adapter.ts";
import type { ToolCallChunk } from "./tool-wire.ts";

/**
 * Wire format of POST /api/chat/stream: newline-delimited JSON
 * (application/x-ndjson), one event per line, in this order:
 *   start, delta*, then exactly one of done or error.
 * `start` is sent when the answering model produces its first text, so it is
 * always followed immediately by the first `delta`. Failover can only happen
 * before that point; the replacement model shows up in `start` and `done`.
 * An `error` after a `delta` means the reply is partial: the client keeps
 * what arrived. `code` reuses the failure kinds of classify-model-failure and
 * never carries provider text.
 */
export type ChatStreamEvent =
  | { type: "start"; provider: string; model?: string }
  | { type: "delta"; text: string }
  | ToolCallChunk
  | {
      type: "done";
      provider: string;
      model?: string;
      failover?: FailoverInfo;
      usage?: StreamUsage;
    }
  | {
      type: "error";
      code: ModelFailureKind;
      provider: string | null;
      status?: number;
    };
