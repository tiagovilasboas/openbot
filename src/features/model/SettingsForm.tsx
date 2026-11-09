"use client";

import { useRef, useState } from "react";
import { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import {
  clearStoredGitHubToken,
  loadStoredGitHubToken,
  saveStoredGitHubToken,
} from "@/features/github/github-config.ts";
import { SheetFooter } from "@/shared/ui/ResponsiveSheet.tsx";
import {
  clearStoredModelConfig,
  saveStoredModelConfig,
  validateClientModelConfig,
  type ClientModelConfig,
  type ModelProviderType,
} from "./model-config.ts";
import {
  clearProviderKeys,
  loadProviderKeys,
  saveProviderKey,
  seedKeysFromConfig,
} from "./provider-keys.ts";
import { lacksRequiredRouterKey } from "./router-key.ts";
import {
  ConnectionTest,
  type ConnectionTestResult,
} from "./ConnectionTest.tsx";
import { getSettingsCopy } from "./settings-copy.ts";
import { SettingsGitHubSection } from "./SettingsGitHubSection.tsx";
import { SettingsProviderFields } from "./SettingsProviderFields.tsx";
import { SettingsProviderSelector } from "./SettingsProviderSelector.tsx";
import { testModelConnection } from "./test-model-connection.ts";

export interface SettingsFormProps {
  language: ChatLanguage;
  currentConfig: ClientModelConfig | null;
  /** False while another settings tab is shown: the footer is not rendered. */
  isActive?: boolean;
  onClose: () => void;
  onSave?: (config: ClientModelConfig) => void;
  onReset?: () => void;
}

export function SettingsForm({
  language,
  currentConfig,
  isActive = true,
  onClose,
  onSave,
  onReset,
}: SettingsFormProps) {
  const content = chatCopy[language];
  const s = getSettingsCopy(language);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [provider, setProvider] = useState<ModelProviderType>(
    currentConfig?.provider ?? "router",
  );

  const [routerUrl, setRouterUrl] = useState(
    currentConfig?.provider === "router"
      ? currentConfig.baseUrl
      : "http://localhost:20128/v1",
  );
  const [routerModel, setRouterModel] = useState(
    currentConfig?.provider === "router" ? currentConfig.model : "o3-mini",
  );
  const [savedKeys] = useState(() =>
    seedKeysFromConfig(loadProviderKeys(), currentConfig),
  );
  const [routerApiKey, setRouterApiKey] = useState(savedKeys.router ?? "");
  const routerKeyRef = useRef<HTMLInputElement>(null);
  const [wasKeyFlagged, setWasKeyFlagged] = useState(false);

  const [localUrl, setLocalUrl] = useState(
    currentConfig?.provider === "local"
      ? currentConfig.baseUrl
      : "http://localhost:11434",
  );
  const [localModel, setLocalModel] = useState(
    currentConfig?.provider === "local" ? currentConfig.model : "llama3",
  );

  const [anthropicKey, setAnthropicKey] = useState(savedKeys.anthropic ?? "");
  const [anthropicModel, setAnthropicModel] = useState(
    currentConfig?.provider === "anthropic"
      ? currentConfig.model
      : "claude-3-5-sonnet-20241022",
  );

  const [gitHubToken, setGitHubToken] = useState(
    () => loadStoredGitHubToken() ?? "",
  );

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
    detail?: string;
  } | null>(null);

  function getCandidateConfig(): ClientModelConfig | null {
    if (provider === "router") {
      return validateClientModelConfig({
        provider: "router",
        baseUrl: routerUrl,
        model: routerModel,
        ...(routerApiKey ? { apiKey: routerApiKey } : {}),
      });
    }
    if (provider === "local") {
      return validateClientModelConfig({
        provider: "local",
        baseUrl: localUrl,
        model: localModel,
      });
    }
    if (provider === "anthropic") {
      return validateClientModelConfig({
        provider: "anthropic",
        apiKey: anthropicKey,
        model: anthropicModel,
      });
    }
    return null;
  }

  // OpenRouter answers 401 to every call without a key, free models included.
  const isRouterKeyMissing =
    provider === "router" && lacksRequiredRouterKey(routerUrl, routerApiKey);

  /** Points at the key field instead of calling a model that will refuse. */
  function flagMissingRouterKey(): boolean {
    if (!isRouterKeyMissing) return false;
    setTestResult(null);
    setWasKeyFlagged(true);
    routerKeyRef.current?.focus();
    return true;
  }

  async function handleTest() {
    const candidate = getCandidateConfig();
    if (!candidate) {
      setTestResult({ ok: false, error: "invalid_fields" });
      return;
    }
    if (flagMissingRouterKey()) return;
    setIsTesting(true);
    setTestResult(null);
    const result = await testModelConnection(candidate);
    setIsTesting(false);
    setTestResult(
      result.ok
        ? { ok: true }
        : { ok: false, error: result.error, detail: result.detail },
    );
  }

  function handleSave() {
    const candidate = getCandidateConfig();
    if (!candidate) {
      setTestResult({ ok: false, error: "invalid_fields" });
      return;
    }
    if (flagMissingRouterKey()) return;
    saveStoredModelConfig(candidate);
    saveProviderKey("router", routerApiKey);
    saveProviderKey("anthropic", anthropicKey);
    if (gitHubToken.trim()) {
      saveStoredGitHubToken(gitHubToken.trim());
    } else {
      clearStoredGitHubToken();
    }
    onSave?.(candidate);
    onClose();
  }

  function handleReset() {
    clearStoredModelConfig();
    clearProviderKeys();
    clearStoredGitHubToken();
    onReset?.();
    onClose();
  }

  const connectionResult: ConnectionTestResult | null = !testResult
    ? null
    : testResult.ok
      ? { ok: true, message: content.testSuccess }
      : {
          ok: false,
          message:
            testResult.error === "invalid_fields"
              ? s.testInvalid
              : `${content.testFailed}: ${testResult.detail ? `${testResult.error} (${testResult.detail})` : testResult.error}`,
        };

  return (
    <>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h3 className="text-[15px] font-semibold text-foreground">
            {s.sectionProvider}
          </h3>
          <SettingsProviderSelector
            provider={provider}
            content={content}
            onSelectProvider={(next) => {
              setProvider(next);
              setTestResult(null);
            }}
          />
        </section>

        <SettingsProviderFields
          provider={provider}
          language={language}
          content={content}
          routerUrl={routerUrl}
          setRouterUrl={setRouterUrl}
          routerModel={routerModel}
          setRouterModel={setRouterModel}
          routerApiKey={routerApiKey}
          setRouterApiKey={setRouterApiKey}
          routerApiKeyError={
            wasKeyFlagged && isRouterKeyMissing ? s.missingKey : null
          }
          routerApiKeyRef={routerKeyRef}
          localUrl={localUrl}
          setLocalUrl={setLocalUrl}
          localModel={localModel}
          setLocalModel={setLocalModel}
          anthropicKey={anthropicKey}
          setAnthropicKey={setAnthropicKey}
          anthropicModel={anthropicModel}
          setAnthropicModel={setAnthropicModel}
        />

        <section className="flex flex-col gap-3">
          <h3 className="text-[15px] font-semibold text-foreground">
            {s.sectionConnection}
          </h3>
          <ConnectionTest
            label={content.testConnection}
            loadingLabel={content.testingConnection}
            isTesting={isTesting}
            result={connectionResult}
            idleHint={s.testIdle}
            onTest={() => void handleTest()}
          />
        </section>

        <SettingsGitHubSection
          language={language}
          token={gitHubToken}
          onTokenChange={setGitHubToken}
        />
      </div>

      {isActive && (
        <SheetFooter>
          {isConfirmingReset ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[15px] font-medium text-foreground md:text-sm">
                  {s.resetConfirm}
                </p>
                <p className="text-[13px] text-subtle">{s.resetConfirmHint}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(false)}
                  className="min-h-11 flex-1 rounded-full border border-border bg-surface px-5 text-[15px] font-medium text-foreground active:scale-[0.97] md:flex-none md:text-sm"
                >
                  {s.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-11 flex-1 rounded-full bg-danger px-5 text-[15px] font-medium text-background active:scale-[0.97] md:flex-none md:text-sm"
                >
                  {s.resetConfirmAction}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmingReset(true)}
                className="min-h-11 rounded-full px-4 text-[15px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground active:scale-[0.97] md:text-sm"
              >
                {content.resetDefaults}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="min-h-11 rounded-full bg-foreground px-6 text-[15px] font-semibold text-background transition-opacity hover:opacity-90 active:scale-[0.97] md:text-sm"
              >
                {content.saveSettings}
              </button>
            </div>
          )}
        </SheetFooter>
      )}
    </>
  );
}
