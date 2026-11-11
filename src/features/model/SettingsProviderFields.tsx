"use client";

import type { Language } from "../language/language.ts";
import type { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { FIELD_CLASS, FormField } from "@/shared/ui/FormField.tsx";
import type { ModelProviderType } from "./model-config.ts";
import { SettingsModelPresets } from "./SettingsModelPresets.tsx";

interface SettingsProviderFieldsProps {
  provider: ModelProviderType;
  language: ChatLanguage;
  content: (typeof chatCopy)[Language];
  routerUrl: string;
  setRouterUrl: (val: string) => void;
  routerModel: string;
  setRouterModel: (val: string) => void;
  localUrl: string;
  setLocalUrl: (val: string) => void;
  localModel: string;
  setLocalModel: (val: string) => void;
  anthropicModel: string;
  setAnthropicModel: (val: string) => void;
}

interface TextRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  mono?: boolean;
  inputMode?: "url";
}

function TextRow({
  label,
  value,
  onChange,
  placeholder,
  mono,
  inputMode,
}: TextRowProps) {
  return (
    <FormField label={label}>
      {(control) => (
        <input
          {...control}
          value={value}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={`${FIELD_CLASS} ${mono ? "font-mono" : ""}`}
        />
      )}
    </FormField>
  );
}

export function SettingsProviderFields({
  provider,
  language,
  content,
  routerUrl,
  setRouterUrl,
  routerModel,
  setRouterModel,
  localUrl,
  setLocalUrl,
  localModel,
  setLocalModel,
  anthropicModel,
  setAnthropicModel,
}: SettingsProviderFieldsProps) {
  if (provider === "router") {
    return (
      <div className="flex flex-col gap-4 md:gap-6">
        <SettingsModelPresets
          provider="router"
          language={language}
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
        <div className="flex flex-col gap-3 md:gap-4">
          <TextRow
            label={content.routerUrlLabel}
            value={routerUrl}
            onChange={setRouterUrl}
            placeholder="http://localhost:20128/v1"
            inputMode="url"
            mono
          />
          <TextRow
            label={content.routerModelLabel}
            value={routerModel}
            onChange={setRouterModel}
            placeholder="o3-mini"
            mono
          />
        </div>
      </div>
    );
  }

  if (provider === "local") {
    return (
      <div className="flex flex-col gap-4 md:gap-6">
        <SettingsModelPresets
          provider="local"
          language={language}
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
        <div className="flex flex-col gap-3 md:gap-4">
          <TextRow
            label={content.localUrlLabel}
            value={localUrl}
            onChange={setLocalUrl}
            placeholder="http://localhost:11434"
            inputMode="url"
            mono
          />
          <TextRow
            label={content.localModelLabel}
            value={localModel}
            onChange={setLocalModel}
            placeholder="llama3"
            mono
          />
        </div>
      </div>
    );
  }

  if (provider === "anthropic") {
    return (
      <div className="flex flex-col gap-4">
        <TextRow
          label={content.anthropicModelLabel}
          value={anthropicModel}
          onChange={setAnthropicModel}
          placeholder="claude-3-5-sonnet-20241022"
          mono
        />
      </div>
    );
  }

  return null;
}
