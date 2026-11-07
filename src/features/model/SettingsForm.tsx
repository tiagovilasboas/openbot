"use client";

import { Button, Chip, Modal } from "@heroui/react";
import { useState } from "react";
import { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import {
  clearStoredGitHubToken,
  loadStoredGitHubToken,
  saveStoredGitHubToken,
} from "@/features/github/github-config.ts";
import {
  clearStoredModelConfig,
  saveStoredModelConfig,
  validateClientModelConfig,
  type ClientModelConfig,
  type ModelProviderType,
} from "./model-config.ts";
import { SettingsGitHubSection } from "./SettingsGitHubSection.tsx";
import { SettingsProviderFields } from "./SettingsProviderFields.tsx";
import { SettingsProviderSelector } from "./SettingsProviderSelector.tsx";
import { testModelConnection } from "./test-model-connection.ts";

export interface SettingsFormProps {
  language: ChatLanguage;
  currentConfig: ClientModelConfig | null;
  onClose: () => void;
  onSave?: (config: ClientModelConfig) => void;
  onReset?: () => void;
}

export function SettingsForm({
  language,
  currentConfig,
  onClose,
  onSave,
  onReset,
}: SettingsFormProps) {
  const content = chatCopy[language];
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
  const [routerApiKey, setRouterApiKey] = useState(
    currentConfig?.provider === "router" ? (currentConfig.apiKey ?? "") : "",
  );

  const [localUrl, setLocalUrl] = useState(
    currentConfig?.provider === "local"
      ? currentConfig.baseUrl
      : "http://localhost:11434",
  );
  const [localModel, setLocalModel] = useState(
    currentConfig?.provider === "local" ? currentConfig.model : "llama3",
  );

  const [anthropicKey, setAnthropicKey] = useState(
    currentConfig?.provider === "anthropic" ? currentConfig.apiKey : "",
  );
  const [anthropicModel, setAnthropicModel] = useState(
    currentConfig?.provider === "anthropic"
      ? currentConfig.model
      : "claude-3-5-sonnet-20241022",
  );

  const [sandboxModel, setSandboxModel] = useState(
    currentConfig?.provider === "sandbox"
      ? currentConfig.model
      : "chief-sim-v1",
  );

  const [gitHubToken, setGitHubToken] = useState(
    () => loadStoredGitHubToken() ?? "",
  );

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
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
    if (provider === "sandbox") {
      return validateClientModelConfig({
        provider: "sandbox",
        model: sandboxModel,
      });
    }
    return null;
  }

  async function handleTest() {
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
      result.ok ? { ok: true } : { ok: false, error: result.error },
    );
  }

  function handleSave() {
    const candidate = getCandidateConfig();
    if (!candidate) {
      setTestResult({ ok: false, error: "invalid_fields" });
      return;
    }
    saveStoredModelConfig(candidate);
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
    clearStoredGitHubToken();
    onReset?.();
    onClose();
  }

  return (
    <>
      <Modal.Header className="flex items-center justify-between border-b border-separator pb-4">
        <div>
          <Modal.Heading className="text-lg font-semibold">
            {content.settingsTitle}
          </Modal.Heading>
          <p className="mt-0.5 text-xs text-muted">
            {content.settingsSubtitle}
          </p>
        </div>
        <Modal.CloseTrigger />
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-4 py-4">
        <SettingsProviderSelector
          provider={provider}
          content={content}
          onSelectProvider={(next) => {
            setProvider(next);
            setTestResult(null);
          }}
        />

        <SettingsProviderFields
          provider={provider}
          content={content}
          routerUrl={routerUrl}
          setRouterUrl={setRouterUrl}
          routerModel={routerModel}
          setRouterModel={setRouterModel}
          routerApiKey={routerApiKey}
          setRouterApiKey={setRouterApiKey}
          localUrl={localUrl}
          setLocalUrl={setLocalUrl}
          localModel={localModel}
          setLocalModel={setLocalModel}
          anthropicKey={anthropicKey}
          setAnthropicKey={setAnthropicKey}
          anthropicModel={anthropicModel}
          setAnthropicModel={setAnthropicModel}
          sandboxModel={sandboxModel}
          setSandboxModel={setSandboxModel}
          onSelectSandboxPreset={() => {
            setProvider("sandbox");
            setSandboxModel("chief-sim-v1");
            setTestResult(null);
          }}
        />

        <div className="pt-1">
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            isDisabled={isTesting}
            onPress={() => void handleTest()}
          >
            {isTesting ? content.testingConnection : content.testConnection}
          </Button>
          {testResult && (
            <div className="mt-2 flex justify-center">
              <Chip
                size="sm"
                variant="soft"
                color={testResult.ok ? "success" : "danger"}
              >
                {testResult.ok
                  ? content.testSuccess
                  : `${content.testFailed}: ${testResult.error}`}
              </Chip>
            </div>
          )}
        </div>

        <SettingsGitHubSection
          language={language}
          token={gitHubToken}
          onTokenChange={setGitHubToken}
        />
      </Modal.Body>

      <Modal.Footer className="flex flex-col-reverse gap-2 border-t border-separator pt-4 sm:flex-row sm:justify-between">
        <Button
          size="md"
          variant="ghost"
          className="text-xs text-muted"
          onPress={handleReset}
        >
          {content.resetDefaults}
        </Button>
        <div className="flex gap-2">
          <Button size="md" variant="secondary" onPress={onClose}>
            {content.close}
          </Button>
          <Button size="md" variant="primary" onPress={handleSave}>
            {content.saveSettings}
          </Button>
        </div>
      </Modal.Footer>
    </>
  );
}
