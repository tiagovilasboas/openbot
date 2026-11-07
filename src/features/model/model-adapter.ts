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
  systemPrompt?: string;
};

export type ModelErrorCode =
  | "no_provider_configured"
  | "provider_unreachable"
  | "provider_rejected"
  | "invalid_provider_response";

export type ModelResult =
  | { ok: true; provider: string; text: string }
  | { ok: false; code: ModelErrorCode; provider: string | null };

export type ModelAdapter = {
  provider: string;
  model?: string;
  generateReply(request: ModelRequest): Promise<ModelResult>;
};

export type FetchLike = typeof fetch;
