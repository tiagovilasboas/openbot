import type {
  ModelAdapter,
  ModelErrorCode,
  ModelRequest,
} from "./model-adapter.ts";
import type { TokenUsage } from "./token-usage.ts";

/** Token counts a provider reported; either side may be missing. */
export type StreamUsage = TokenUsage;

/**
 * What an adapter yields while a reply streams. `failed` is always the last
 * chunk; ending without it means the reply completed.
 */
export type ModelStreamChunk =
  | { type: "delta"; text: string }
  | { type: "usage"; usage: StreamUsage }
  | { type: "failed"; code: ModelErrorCode; detail?: string };

/** Opening a stream either yields chunks or fails before any byte arrived. */
export type ModelStreamOpen =
  | {
      ok: true;
      provider: string;
      model?: string;
      chunks: AsyncIterable<ModelStreamChunk>;
    }
  | {
      ok: false;
      code: ModelErrorCode;
      provider: string | null;
      detail?: string;
    };

/**
 * The one streaming contract. `signal` is the caller's abort (client gone or
 * deadline); adapters pass it to the upstream fetch and stop reading on abort.
 */
export interface StreamingModelAdapter extends ModelAdapter {
  streamReply(
    request: ModelRequest,
    signal?: AbortSignal,
  ): Promise<ModelStreamOpen>;
}
