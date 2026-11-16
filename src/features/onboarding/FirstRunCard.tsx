"use client";

import { useState } from "react";
import { useSavedKeys } from "@/features/key-vault/use-saved-keys.ts";
import { saveStoredModelConfig } from "@/features/model/model-config.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { firstRunCopy } from "./first-run-copy.ts";
import { START_FREE_CONFIG, firstRunStep } from "./first-run-state.ts";

interface FirstRunCardProps {
  language: ChatLanguage;
  /** A model (the user's or the server's) is ready to answer. */
  isConfigured: boolean;
  /** Opens Settings, where a provider is connected. */
  onConnect: () => void;
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
  onConnect,
  onStarter,
}: FirstRunCardProps) {
  const copy = firstRunCopy[language];
  const [startedFree, setStartedFree] = useState(false);
  const { keys, loaded } = useSavedKeys();
  const step = firstRunStep({
    isConfigured,
    startedFree,
    savedKeys: keys,
    savedKeysLoaded: loaded,
  });

  if (step === "hidden") return null;

  const startFree = () => {
    saveStoredModelConfig(START_FREE_CONFIG);
    setStartedFree(true);
    onStarter(copy.starterPrompt);
  };

  return (
    <section
      aria-labelledby="first-run-title"
      className="mt-6 flex w-full max-w-sm animate-enter flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-left"
    >
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
          <p className="-mt-1.5 text-center text-[12px] text-subtle">
            {copy.startFreeHint}
          </p>
          <button type="button" onClick={onConnect} className={secondaryButton}>
            {copy.connect}
          </button>
          <p className="-mt-1.5 text-center text-[12px] text-subtle">
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
            <button type="button" onClick={onConnect} className={primaryButton}>
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
