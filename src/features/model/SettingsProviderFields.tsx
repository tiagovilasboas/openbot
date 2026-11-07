"use client";

import { Input, Label } from "@heroui/react";
import type { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ModelProviderType } from "./model-config.ts";
import { SettingsModelPresets } from "./SettingsModelPresets.tsx";

interface SettingsProviderFieldsProps {
  provider: ModelProviderType;
  content: (typeof chatCopy)["pt" | "en"];
  routerUrl: string;
  setRouterUrl: (val: string) => void;
  routerModel: string;
  setRouterModel: (val: string) => void;
  routerApiKey: string;
  setRouterApiKey: (val: string) => void;
  localUrl: string;
  setLocalUrl: (val: string) => void;
  localModel: string;
  setLocalModel: (val: string) => void;
  anthropicKey: string;
  setAnthropicKey: (val: string) => void;
  anthropicModel: string;
  setAnthropicModel: (val: string) => void;
}

export function SettingsProviderFields({
  provider,
  content,
  routerUrl,
  setRouterUrl,
  routerModel,
  setRouterModel,
  routerApiKey,
  setRouterApiKey,
  localUrl,
  setLocalUrl,
  localModel,
  setLocalModel,
  anthropicKey,
  setAnthropicKey,
  anthropicModel,
  setAnthropicModel,
}: SettingsProviderFieldsProps) {
  if (provider === "router") {
    return (
      <div className="flex flex-col gap-3">
        <SettingsModelPresets
          provider="router"
          content={content}
          routerUrl={routerUrl}
          routerModel={routerModel}
          localUrl={localUrl}
          localModel={localModel}
          onSelectRouterPreset={(url, model) => {
            setRouterUrl(url);
            setRouterModel(model);
          }}
          onSelectRouterModel={(model) => setRouterModel(model)}
          onSelectLocalPreset={() => {}}
        />

        <div>
          <Label className="mb-1 block text-xs font-medium">
            {content.routerUrlLabel}
          </Label>
          <Input
            fullWidth
            value={routerUrl}
            onChange={(e) => setRouterUrl(e.target.value)}
            placeholder="http://localhost:20128/v1"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs font-medium">
            {content.routerModelLabel}
          </Label>
          <Input
            fullWidth
            value={routerModel}
            onChange={(e) => setRouterModel(e.target.value)}
            placeholder="o3-mini"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs font-medium">
            {content.routerApiKeyLabel}
          </Label>
          <Input
            fullWidth
            type="password"
            value={routerApiKey}
            onChange={(e) => setRouterApiKey(e.target.value)}
            placeholder="sk-or-v1-..."
          />
        </div>
      </div>
    );
  }

  if (provider === "local") {
    return (
      <div className="flex flex-col gap-3">
        <SettingsModelPresets
          provider="local"
          content={content}
          routerUrl={routerUrl}
          routerModel={routerModel}
          localUrl={localUrl}
          localModel={localModel}
          onSelectRouterPreset={() => {}}
          onSelectRouterModel={() => {}}
          onSelectLocalPreset={(url, model) => {
            setLocalUrl(url);
            setLocalModel(model);
          }}
        />

        <div>
          <Label className="mb-1 block text-xs font-medium">
            {content.localUrlLabel}
          </Label>
          <Input
            fullWidth
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            placeholder="http://localhost:11434"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs font-medium">
            {content.localModelLabel}
          </Label>
          <Input
            fullWidth
            value={localModel}
            onChange={(e) => setLocalModel(e.target.value)}
            placeholder="llama3"
          />
        </div>
      </div>
    );
  }

  if (provider === "anthropic") {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <Label className="mb-1 block text-xs font-medium">
            {content.anthropicKeyLabel}
          </Label>
          <Input
            fullWidth
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-api03-..."
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs font-medium">
            {content.anthropicModelLabel}
          </Label>
          <Input
            fullWidth
            value={anthropicModel}
            onChange={(e) => setAnthropicModel(e.target.value)}
            placeholder="claude-3-5-sonnet-20241022"
          />
        </div>
      </div>
    );
  }

  return null;
}
