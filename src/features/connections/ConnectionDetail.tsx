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
import {
  checkConnectionKey,
  connectKey,
  disconnectKey,
  type KeyCheckOutcome,
} from "./manage-connection.ts";

interface ConnectionDetailProps {
  entry: ConnectionEntry;
  language: ChatLanguage;
  savedKey: string | null;
  showSecretLabel: string;
  hideSecretLabel: string;
  onBack: () => void;
}

/** One service at a time: its key, a link to create one, test and connect. */
export function ConnectionDetail({
  entry,
  language,
  savedKey,
  showSecretLabel,
  hideSecretLabel,
  onBack,
}: ConnectionDetailProps) {
  const c = getConnectionsCopy(language);
  const [key, setKey] = useState(savedKey ?? "");
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  function describeFailure(outcome: Extract<KeyCheckOutcome, { ok: false }>) {
    const reason =
      outcome.error === "unauthorized"
        ? c.unauthorized
        : outcome.error === "rate_limited"
          ? c.rateLimited
          : outcome.error === "network_error"
            ? c.network
            : outcome.detail
              ? `${outcome.error} (${outcome.detail})`
              : outcome.error;
    return fillCopy(c.rejected, { reason });
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
    connectKey(entry.id, key);
    setResult({
      ok: true,
      message: outcome.user
        ? fillCopy(c.connectedAs, { user: outcome.user })
        : c.connectedOk,
    });
  }

  function handleDisconnect() {
    disconnectKey(entry.id);
    onBack();
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 flex min-h-11 w-fit items-center gap-1 rounded-full px-2 text-[15px] font-medium text-muted transition-colors hover:text-foreground md:text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        {c.back}
      </button>

      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-foreground">
          {fillCopy(savedKey ? c.manageTitle : c.connectTitle, {
            name: entry.name,
          })}
        </h3>
        <p className="text-[13px] text-subtle">{c.descriptions[entry.id]}</p>
      </header>

      <div className="flex flex-col gap-2">
        <FormField
          label={entry.id === "github" ? c.tokenLabel : c.keyLabel}
          helper={c.storedHere}
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
          className="w-fit text-[13px] font-medium text-bot-accent underline-offset-2 hover:underline"
        >
          {fillCopy(c.getKey, { url: entry.keyUrlLabel })}
        </a>
      </div>

      <ConnectionTest
        label={savedKey ? c.testAndSave : c.testAndConnect}
        loadingLabel={c.testing}
        isTesting={isTesting}
        result={result}
        onTest={() => void handleConnect()}
      />

      {savedKey && (
        <button
          type="button"
          onClick={handleDisconnect}
          className="min-h-11 w-full rounded-full px-5 text-[15px] font-medium text-danger transition-colors hover:bg-danger-soft active:scale-[0.97] md:text-sm"
        >
          {c.disconnect}
        </button>
      )}
    </div>
  );
}
