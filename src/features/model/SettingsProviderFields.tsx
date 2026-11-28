"use client";

import type { Language } from "../language/language.ts";
import type { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { isOpenRouterUrl } from "@/features/connections/copy.ts";
import { AlertIcon } from "@/shared/ui/FieldIcons.tsx";
import { Disclosure } from "@/shared/ui/Disclosure.tsx";
import { FIELD_CLASS, FormField } from "@/shared/ui/FormField.tsx";
import type { ModelProviderType } from "./model-config.ts";
import { SettingsModelPresets } from "./SettingsModelPresets.tsx";
import { fillCopy, getSettingsCopy } from "./settings-copy.ts";
import { SETTINGS_FORM_DEFAULTS } from "./settings-form-defaults.ts";

export interface ChatGptConnectionStatus {
  loaded: boolean;
  connected: boolean;
  needsReauth: boolean;
  accountLabel: string | null;
}

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
  chatgptModel: string;
  setChatgptModel: (val: string) => void;
  chatgptStatus: ChatGptConnectionStatus;
  onOpenConnections?: () => void;
  /** Switches to the router provider, pointed at a local OpenAI-style server. */
  onUseLocalRouter: (url: string, model: string) => void;
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
  chatgptModel,
  setChatgptModel,
  chatgptStatus,
  onOpenConnections,
  onUseLocalRouter,
}: SettingsProviderFieldsProps) {
  const s = getSettingsCopy(language);
  if (provider === "router") {
    // A preset fills URL and model: they only need to be seen when custom.
    const isPreset =
      isOpenRouterUrl(routerUrl) ||
      routerUrl.includes(":3000") ||
      routerUrl.includes(":20128");
    return (
      <div className="flex flex-col gap-3 md:gap-5">
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
          onSelectLocalRouter={() => {}}
        />
        <Disclosure summary={s.sectionAdvanced} defaultOpen={!isPreset}>
          <TextRow
            label={content.routerUrlLabel}
            value={routerUrl}
            onChange={setRouterUrl}
            placeholder={SETTINGS_FORM_DEFAULTS.routerUrl}
            inputMode="url"
            mono
          />
          <TextRow
            label={content.routerModelLabel}
            value={routerModel}
            onChange={setRouterModel}
            placeholder={SETTINGS_FORM_DEFAULTS.routerModel}
            mono
          />
        </Disclosure>
      </div>
    );
  }

  if (provider === "local") {
    return (
      <div className="flex flex-col gap-3 md:gap-5">
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
          onSelectLocalRouter={onUseLocalRouter}
        />
        <div className="grid gap-3 min-[360px]:grid-cols-2 md:gap-4">
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
      <div className="flex flex-col gap-3">
        <TextRow
          label={content.anthropicModelLabel}
          value={anthropicModel}
          onChange={setAnthropicModel}
          placeholder={SETTINGS_FORM_DEFAULTS.anthropicModel}
          mono
        />
      </div>
    );
  }

  if (provider === "chatgpt") {
    const needsAttention =
      !chatgptStatus.connected || chatgptStatus.needsReauth;
    const statusMessage = !chatgptStatus.connected
      ? s.chatgptStatusMissing
      : chatgptStatus.needsReauth
        ? s.chatgptStatusReauth
        : chatgptStatus.accountLabel
          ? fillCopy(s.chatgptStatusAccount, {
              account: chatgptStatus.accountLabel,
            })
          : s.chatgptStatusConnected;
    return (
      <div className="flex flex-col gap-3">
        <TextRow
          label={content.chatgptModelLabel}
          value={chatgptModel}
          onChange={setChatgptModel}
          placeholder={SETTINGS_FORM_DEFAULTS.chatgptModel}
          mono
        />
        {chatgptStatus.loaded && (
          <div
            role="status"
            className={`flex items-center gap-3 rounded-xl py-1.5 pe-1.5 ps-3 ${
              needsAttention
                ? "bg-warning-soft text-warning"
                : "bg-surface text-foreground"
            }`}
          >
            {needsAttention && <AlertIcon className="size-4 shrink-0" />}
            <p className="min-w-0 flex-1 text-[13px]">{statusMessage}</p>
            {onOpenConnections && (
              <button
                type="button"
                onClick={onOpenConnections}
                className="min-h-11 shrink-0 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background active:scale-[0.97]"
              >
                {needsAttention ? s.connectAction : s.chatgptManageConnection}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}
