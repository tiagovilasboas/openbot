import type { ClientModelConfig } from "./model-config.ts";

export type ModelLanguage = "pt" | "en";

export type ModelMessage = {
  role: "assistant" | "user";
  text: string;
};

export type ModelRequest = {
  language: ModelLanguage;
  messages: ModelMessage[];
  config?: ClientModelConfig;
  fallbackConfig?: ClientModelConfig;
  systemPrompt?: string;
  /** Replaces the configured model for this call only. */
  modelId?: string;
};

export type ModelErrorCode =
  | "no_provider_configured"
  | "provider_unreachable"
  | "provider_rejected"
  | "blocked_base_url"
  | "invalid_provider_response";

export type FailoverInfo = {
  fromModel: string;
  toModel: string;
  reason: string;
};

export type ModelResult =
  | { ok: true; provider: string; text: string; failover?: FailoverInfo }
  | {
      ok: false;
      code: ModelErrorCode;
      provider: string | null;
      detail?: string;
    };

export type ModelAdapter = {
  provider: string;
  model?: string;
  generateReply(request: ModelRequest): Promise<ModelResult>;
};

export type FetchLike = typeof fetch;
