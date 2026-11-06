"use client";

import { Button, ButtonGroup, Chip, Label, Modal } from "@heroui/react";
import { useState } from "react";
import { chatCopy } from "@/features/chat/chat-copy";
import type { ChatLanguage } from "@/features/chat/respond-to-message";
import {
  clearStoredModelConfig,
  saveStoredModelConfig,
  validateClientModelConfig,
  type ClientModelConfig,
  type ModelProviderType,
} from "./model-config";
import { SettingsProviderFields } from "./SettingsProviderFields";
import { testModelConnection } from "./test-model-connection";

interface SettingsModalProps {
  isOpen: boolean;
  language: ChatLanguage;
  currentConfig: ClientModelConfig | null;
  onClose: () => void;
  onSave?: (config: ClientModelConfig) => void;
  onReset?: () => void;
}

interface SettingsFormProps {
  language: ChatLanguage;
  currentConfig: ClientModelConfig | null;
  onClose: () => void;
  onSave?: (config: ClientModelConfig) => void;
  onReset?: () => void;
}

function SettingsForm({
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
    onSave?.(candidate);
    onClose();
  }

  function handleReset() {
    clearStoredModelConfig();
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
        <div>
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
            {content.provider}
          </Label>
          <ButtonGroup aria-label={content.provider} className="w-full">
            <Button
              size="md"
              className="flex-1"
              variant={provider === "router" ? "primary" : "secondary"}
              onPress={() => {
                setProvider("router");
                setTestResult(null);
              }}
            >
              {content.providerRouter}
            </Button>
            <Button
              size="md"
              className="flex-1"
              variant={provider === "local" ? "primary" : "secondary"}
              onPress={() => {
                setProvider("local");
                setTestResult(null);
              }}
            >
              {content.providerLocal}
            </Button>
            <Button
              size="md"
              className="flex-1"
              variant={provider === "anthropic" ? "primary" : "secondary"}
              onPress={() => {
                setProvider("anthropic");
                setTestResult(null);
              }}
            >
              {content.providerAnthropic}
            </Button>
          </ButtonGroup>
          <p className="mt-1.5 text-xs text-muted">
            {provider === "router"
              ? content.providerRouterHint
              : provider === "local"
                ? content.providerLocalHint
                : content.providerAnthropicHint}
          </p>
        </div>

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
        />

        <div className="pt-2">
          <Button
            size="md"
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

export function SettingsModal({
  isOpen,
  language,
  currentConfig,
  onClose,
  onSave,
  onReset,
}: SettingsModalProps) {
  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog className="max-h-[90vh] overflow-y-auto rounded-2xl border border-separator bg-surface p-6 shadow-2xl">
            {isOpen && (
              <SettingsForm
                key={
                  currentConfig
                    ? `${currentConfig.provider}-${"model" in currentConfig ? currentConfig.model : ""}`
                    : "initial"
                }
                language={language}
                currentConfig={currentConfig}
                onClose={onClose}
                onSave={onSave}
                onReset={onReset}
              />
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
