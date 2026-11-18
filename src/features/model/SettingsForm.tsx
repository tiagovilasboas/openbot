"use client";

import { useState } from "react";
import {
  OffProviderNotice,
  useOffProviders,
} from "@/features/connections/index.ts";
import { providerTypeUsability } from "@/features/connections/copy.ts";
import { chatCopy } from "@/features/chat/chat-copy.ts";
import { describeModelFailurePlain } from "@/features/chat/describe-model-failure.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { clearStoredGitHubToken } from "@/features/github/github-config.ts";
import {
  clearStoredModelConfig,
  saveStoredModelConfig,
  validateClientModelConfig,
  type ClientModelConfig,
  type ModelProviderType,
} from "./model-config.ts";
import { keyOriginFor } from "../key-vault/key-origin.ts";
import {
  deleteAllSavedKeys,
  hasSavedKeyFor,
} from "../key-vault/saved-keys-api.ts";
import { refreshSavedKeys } from "../key-vault/saved-keys-store.ts";
import { useSavedKeys } from "../key-vault/use-saved-keys.ts";
import { classifyModelFailure } from "./classify-model-failure.ts";
import { lacksRequiredRouterKey } from "./router-key.ts";
import {
  ConnectionTest,
  type ConnectionTestResult,
} from "./ConnectionTest.tsx";
import { MissingKeyNotice } from "./MissingKeyNotice.tsx";
import { getSettingsCopy } from "./settings-copy.ts";
import { SettingsProviderFields } from "./SettingsProviderFields.tsx";
import { SettingsFormFooter } from "./SettingsFormFooter.tsx";
import { SettingsProviderSelector } from "./SettingsProviderSelector.tsx";
import { testModelConnection } from "./test-model-connection.ts";
import { SETTINGS_FORM_DEFAULTS } from "./settings-form-defaults.ts";

export interface SettingsFormProps {
  language: ChatLanguage;
  currentConfig: ClientModelConfig | null;
  /** False while another settings tab is shown: the footer is not rendered. */
  isActive?: boolean;
  onClose: () => void;
  onSave?: (config: ClientModelConfig) => void;
  onReset?: () => void;
  /** Opens the Connections tab, where keys are added. */
  onOpenConnections?: () => void;
}

export function SettingsForm({
  language,
  currentConfig,
  isActive = true,
  onClose,
  onSave,
  onReset,
  onOpenConnections,
}: SettingsFormProps) {
  const content = chatCopy[language];
  const s = getSettingsCopy(language);
  const saved = useSavedKeys();
  const offProviders = useOffProviders();
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [provider, setProvider] = useState<ModelProviderType>(
    currentConfig?.provider ?? "router",
  );

  const [routerUrl, setRouterUrl] = useState(
    currentConfig?.provider === "router"
      ? currentConfig.baseUrl
      : SETTINGS_FORM_DEFAULTS.routerUrl,
  );
  const [routerModel, setRouterModel] = useState(
    currentConfig?.provider === "router"
      ? currentConfig.model
      : SETTINGS_FORM_DEFAULTS.routerModel,
  );

  const [localUrl, setLocalUrl] = useState(
    currentConfig?.provider === "local"
      ? currentConfig.baseUrl
      : "http://localhost:11434",
  );
  const [localModel, setLocalModel] = useState(
    currentConfig?.provider === "local" ? currentConfig.model : "llama3",
  );

  const [anthropicModel, setAnthropicModel] = useState(
    currentConfig?.provider === "anthropic"
      ? currentConfig.model
      : SETTINGS_FORM_DEFAULTS.anthropicModel,
  );

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
    detail?: string;
  } | null>(null);

  function getCandidateConfig(): ClientModelConfig | null {
    // No key here: the server adds the saved one when the config is used.
    if (provider === "router") {
      return validateClientModelConfig({
        provider: "router",
        baseUrl: routerUrl,
        model: routerModel,
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
        model: anthropicModel,
      });
    }
    return null;
  }

  // OpenRouter answers 401 to every call without a key, free models included.
  // Not flagged until the server has said which keys it holds.
  const routerKey = hasSavedKeyFor(
    saved.keys,
    "router",
    keyOriginFor({ provider: "router", baseUrl: routerUrl, model: "-" }),
  );
  const missingKeyProvider = !saved.loaded
    ? null
    : provider === "router" &&
        lacksRequiredRouterKey(routerUrl, routerKey ? "saved" : undefined)
      ? "OpenRouter"
      : provider === "anthropic" && !saved.keys.anthropic
        ? "Anthropic"
        : null;

  // A provider switched off in Connections cannot be tested or saved.
  const usability = providerTypeUsability(provider, offProviders);
  const offProvider = usability.usable ? null : usability.provider;

  async function handleTest() {
    if (missingKeyProvider || offProvider) return;
    const candidate = getCandidateConfig();
    if (!candidate) {
      setTestResult({ ok: false, error: "invalid_fields" });
      return;
    }
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
    if (missingKeyProvider || offProvider) return;
    const candidate = getCandidateConfig();
    if (!candidate) {
      setTestResult({ ok: false, error: "invalid_fields" });
      return;
    }
    saveStoredModelConfig(candidate);
    onSave?.(candidate);
    onClose();
  }

  function handleReset() {
    clearStoredModelConfig();
    void deleteAllSavedKeys().then(refreshSavedKeys);
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
              : `${content.testFailed}: ${describeModelFailurePlain(
                  classifyModelFailure(testResult.error, testResult.detail),
                  language,
                )}`,
        };

  return (
    <>
      <div className="flex flex-col gap-5 md:gap-8">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {s.sectionProvider}
          </h3>
          <SettingsProviderSelector
            provider={provider}
            content={content}
            language={language}
            offProviders={offProviders}
            onSelectProvider={(next) => {
              setProvider(next);
              setTestResult(null);
            }}
          />
          {offProviders
            .filter((id) => id === "router" || id === "anthropic")
            .map((id) => (
              <OffProviderNotice
                key={id}
                language={language}
                provider={id}
                kind="offFormNotice"
                onOpenConnections={onOpenConnections}
              />
            ))}
        </section>

        <SettingsProviderFields
          provider={provider}
          language={language}
          content={content}
          routerUrl={routerUrl}
          setRouterUrl={setRouterUrl}
          routerModel={routerModel}
          setRouterModel={setRouterModel}
          localUrl={localUrl}
          setLocalUrl={setLocalUrl}
          localModel={localModel}
          setLocalModel={setLocalModel}
          anthropicModel={anthropicModel}
          setAnthropicModel={setAnthropicModel}
          onUseLocalRouter={(url, model) => {
            setProvider("router");
            setRouterUrl(url);
            setRouterModel(model);
          }}
        />

        {missingKeyProvider && !offProvider && (
          <MissingKeyNotice
            provider={missingKeyProvider}
            language={language}
            onConnect={onOpenConnections}
          />
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">
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
      </div>

      {isActive && (
        <SettingsFormFooter
          s={s}
          content={content}
          isConfirming={isConfirmingReset}
          onConfirmingChange={setIsConfirmingReset}
          onReset={handleReset}
          onSave={handleSave}
          saveDisabled={Boolean(offProvider)}
        />
      )}
    </>
  );
}
