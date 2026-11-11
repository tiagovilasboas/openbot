import type { Language } from "../language/language.ts";
import type { ClientModelConfig } from "./model-config.ts";
import type { TokenUsage } from "./token-usage.ts";

export type ModelLanguage = Language;

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
  | "invalid_provider_response"
  | "response_too_long";

export type FailoverInfo = {
  fromModel: string;
  toModel: string;
  reason: string;
};

export type ModelResult =
  | {
      ok: true;
      provider: string;
      text: string;
      failover?: FailoverInfo;
      /** What the provider reported; absent when it reported nothing. */
      usage?: TokenUsage;
    }
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
