"use client";

import { useState } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { ConnectionTest } from "@/features/model/ConnectionTest.tsx";
import { fillCopy } from "@/features/model/settings-copy.ts";
import { ChevronLeftIcon } from "@/shared/ui/FieldIcons.tsx";
import { FormField } from "@/shared/ui/FormField.tsx";
import { SecretInput } from "@/shared/ui/SecretInput.tsx";
import type { ConnectionEntry } from "./connection-catalog.ts";
import { getConnectionsCopy } from "./connections-copy.ts";
import { describeKeyFailure } from "./describe-key-failure.ts";
import {
  checkConnectionKey,
  connectKey,
  disconnectKey,
  type KeyCheckOutcome,
} from "./manage-connection.ts";

interface ConnectionDetailProps {
  entry: ConnectionEntry;
  language: ChatLanguage;
  /** The GitHub token to show; model keys are never sent to the browser. */
  savedToken: string | null;
  isSaved: boolean;
  showSecretLabel: string;
  hideSecretLabel: string;
  onBack: () => void;
}

/** One service at a time: its key, a link to create one, test and connect. */
export function ConnectionDetail({
  entry,
  language,
  savedToken,
  isSaved,
  showSecretLabel,
  hideSecretLabel,
  onBack,
}: ConnectionDetailProps) {
  const c = getConnectionsCopy(language);
  const [key, setKey] = useState(savedToken ?? "");
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  function describeFailure(outcome: Extract<KeyCheckOutcome, { ok: false }>) {
    return fillCopy(c.rejected, {
      reason: describeKeyFailure(entry.id, outcome, language),
    });
  }

  async function handleConnect() {
    if (!key.trim()) {
      setResult({ ok: false, message: c.emptyKey });
      return;
    }
    setIsTesting(true);
    setResult(null);
    const outcome = await checkConnectionKey(entry.id, key);
    setIsTesting(false);
    if (!outcome.ok) {
      setResult({ ok: false, message: describeFailure(outcome) });
      return;
    }
    const isSaved = await connectKey(entry.id, key);
    if (!isSaved) {
      setResult({ ok: false, message: c.saveFailed });
      return;
    }
    // A model key now lives on the server; the field never holds it again.
    if (entry.id !== "github") setKey("");
    setResult({
      ok: true,
      message: outcome.user
        ? fillCopy(c.connectedAs, { user: outcome.user })
        : c.connectedOk,
    });
  }

  async function handleDisconnect() {
    await disconnectKey(entry.id);
    onBack();
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 flex min-h-11 w-fit items-center gap-1 rounded-full px-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" />
        {c.back}
      </button>

      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-foreground">
          {fillCopy(isSaved ? c.manageTitle : c.connectTitle, {
            name: entry.name,
          })}
        </h3>
        <p className="text-[13px] text-subtle">{c.descriptions[entry.id]}</p>
      </header>

      <div className="flex flex-col gap-1">
        <FormField
          label={entry.id === "github" ? c.tokenLabel : c.keyLabel}
          helper={isSaved && entry.id !== "github" ? c.keySaved : c.storedHere}
        >
          {(control) => (
            <SecretInput
              {...control}
              value={key}
              onChange={(value) => {
                setKey(value);
                setResult(null);
              }}
              placeholder={entry.placeholder}
              showLabel={showSecretLabel}
              hideLabel={hideSecretLabel}
            />
          )}
        </FormField>
        <a
          href={entry.keyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 w-fit items-center text-[13px] font-medium text-bot-accent underline-offset-2 hover:underline"
        >
          {fillCopy(c.getKey, { url: entry.keyUrlLabel })}
        </a>
      </div>

      <ConnectionTest
        label={isSaved ? c.testAndSave : c.testAndConnect}
        loadingLabel={c.testing}
        isTesting={isTesting}
        result={result}
        onTest={() => void handleConnect()}
      />

      {isSaved && (
        <button
          type="button"
          onClick={() => void handleDisconnect()}
          className="min-h-11 w-full rounded-full px-5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft active:scale-[0.97]"
        >
          {c.disconnect}
        </button>
      )}
    </div>
  );
}
