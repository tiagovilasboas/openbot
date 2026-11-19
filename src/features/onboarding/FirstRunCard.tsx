"use client";

import { useEffect, useState } from "react";
import {
  ConnectProvider,
  useConnectFlow,
} from "@/features/connections/index.ts";
import { refreshSavedKeys } from "@/features/key-vault/saved-keys-store.ts";
import { useSavedKeys } from "@/features/key-vault/use-saved-keys.ts";
import { saveStoredModelConfig } from "@/features/model/model-config.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import {
  cameBackToFirstRun,
  clearFirstRunReturn,
  markFirstRunConnect,
  settleFirstRunConnect,
} from "./first-run-return.ts";
import { showFirstRunFailure } from "./first-run-failure.ts";
import { firstRunCopy } from "./first-run-copy.ts";
import { START_FREE_CONFIG, firstRunStep } from "./first-run-state.ts";

interface FirstRunCardProps {
  language: ChatLanguage;
  /** A model (the user's or the server's) is ready to answer. */
  isConfigured: boolean;
  /** The server has not said yet whether it has a model: show nothing. */
  isChecking: boolean;
  /** Opens Settings, for providers other than OpenRouter. */
  onOpenSettings: () => void;
  /** Puts the starter task in the composer. */
  onStarter: (prompt: string) => void;
}

const primaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-[14px] font-semibold text-background transition-transform duration-(--duration-micro) ease-out-expo active:scale-[0.97]";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-[14px] font-medium text-foreground transition-transform duration-(--duration-micro) ease-out-expo active:scale-[0.97]";

/**
 * First-run step: one question, two answers. "Start free" stores the free
 * OpenRouter config and leaves a starter task in the composer; it never calls
 * a provider. OpenRouter needs a key even for free models, so without a saved
 * one the card says so and leads to the connect path.
 */
export function FirstRunCard({
  language,
  isConfigured,
  isChecking,
  onOpenSettings,
  onStarter,
}: FirstRunCardProps) {
  const copy = firstRunCopy[language];
  const [startedFree, setStartedFree] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const flow = useConnectFlow();
  const { keys, loaded, failed } = useSavedKeys();
  const step = firstRunStep({
    isConfigured,
    startedFree,
    savedKeys: keys,
    savedKeysLoaded: loaded,
    savedKeysFailed: failed,
  });

  // A model is ready: a first-run Connect that came back is over, failed or not.
  useEffect(() => settleFirstRunConnect(isConfigured), [isConfigured]);

  // While the server still says nothing about a model, show no choice yet.
  if (isChecking || step === "hidden") return null;

  if (isConnecting) {
    return (
      <section
        aria-label={copy.connect}
        className="mt-4 flex w-full max-w-sm animate-enter flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3.5 text-left md:mt-6 md:gap-3 md:p-4"
      >
        <ConnectProvider
          id="router"
          language={language}
          backLabel={copy.back}
          onBack={() => {
            clearFirstRunReturn();
            setIsConnecting(false);
          }}
          onBegin={markFirstRunConnect}
        />
        <button
          type="button"
          onClick={onOpenSettings}
          className="min-h-11 self-start text-[13px] font-medium text-muted underline underline-offset-2"
        >
          {copy.otherProviders}
        </button>
      </section>
    );
  }

  const showFailure = showFirstRunFailure(flow, cameBackToFirstRun());
  const retryConnect = () => {
    clearFirstRunReturn();
    setIsConnecting(true);
  };

  const startFree = () => {
    saveStoredModelConfig(START_FREE_CONFIG);
    setStartedFree(true);
    onStarter(copy.starterPrompt);
  };

  return (
    <section
      aria-labelledby="first-run-title"
      className="mt-4 flex w-full max-w-sm animate-enter flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3.5 text-left md:mt-6 md:gap-3 md:p-4"
    >
      {showFailure && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 text-[13px] text-danger"
        >
          <span>{copy.connectFailed}</span>
          <button
            type="button"
            onClick={retryConnect}
            className="min-h-11 font-medium underline underline-offset-2"
          >
            {copy.retry}
          </button>
        </div>
      )}

      {step === "choose" && (
        <>
          <div>
            <h3
              id="first-run-title"
              className="text-[15px] font-semibold text-foreground"
            >
              {copy.title}
            </h3>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              {copy.chooseBody}
            </p>
          </div>
          <button type="button" onClick={startFree} className={primaryButton}>
            {copy.startFree}
          </button>
          <p className="-mt-1 text-center text-xs text-subtle md:-mt-1.5">
            {copy.startFreeHint}
          </p>
          <button
            type="button"
            onClick={() => setIsConnecting(true)}
            className={secondaryButton}
          >
            {copy.connect}
          </button>
          <p className="-mt-1 text-center text-xs text-subtle md:-mt-1.5">
            {copy.connectHint}
          </p>
        </>
      )}

      {step === "checking" && (
        <p
          id="first-run-title"
          role="status"
          className="text-[13px] text-muted"
        >
          {copy.checking}
        </p>
      )}

      {step === "load-failed" && (
        <div
          id="first-run-title"
          role="alert"
          className="flex flex-wrap items-center gap-x-3 text-[13px] text-danger"
        >
          <span>{copy.checkFailed}</span>
          <button
            type="button"
            onClick={() => void refreshSavedKeys()}
            className="min-h-11 font-medium underline underline-offset-2"
          >
            {copy.retry}
          </button>
        </div>
      )}

      {step === "needs-key" && (
        <>
          <div role="status">
            <h3
              id="first-run-title"
              className="text-[15px] font-semibold text-foreground"
            >
              {copy.needsKeyTitle}
            </h3>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              {copy.needsKeyBody}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsConnecting(true)}
              className={primaryButton}
            >
              {copy.connectKey}
            </button>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className={secondaryButton}
            >
              {copy.getKey}
            </a>
          </div>
        </>
      )}
    </section>
  );
}
