"use client";

import { useState } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { fillCopy } from "@/features/model/settings-copy.ts";
import type { ClientModelConfig } from "@/features/model/model-config.ts";
import { ANTHROPIC_DEFAULT_MODEL, OPENROUTER_FREE_MODEL } from "../copy.ts";
import { setProviderEnabled } from "../switch/set-provider-enabled.ts";
import type { ConnectionEntry } from "./connection-catalog.ts";
import { getConnectionsCopy } from "./connections-copy.ts";

export interface ProviderPageState {
  isOff: boolean;
  activeConfig: ClientModelConfig | null;
}

interface ProviderPageSectionProps extends ProviderPageState {
  entry: ConnectionEntry;
  language: ChatLanguage;
  isSaved: boolean;
}

/** The provider's page: its model, whether a key is saved, and the switch. */
export function ProviderPageSection({
  entry,
  language,
  isSaved,
  isOff,
  activeConfig,
}: ProviderPageSectionProps) {
  const c = getConnectionsCopy(language);
  const [refused, setRefused] = useState(false);
  if (entry.group !== "models") return null;

  const isInUse = activeConfig?.provider === entry.id;
  const model = isInUse
    ? fillCopy(c.modelsActive, { model: activeConfig.model })
    : fillCopy(c.modelsDefault, {
        model:
          entry.id === "anthropic"
            ? ANTHROPIC_DEFAULT_MODEL
            : OPENROUTER_FREE_MODEL,
      });
  const on = !isOff;

  function toggle() {
    const change = setProviderEnabled(entry.id, !on);
    setRefused(!change.ok);
  }

  return (
    <section className="flex flex-col gap-2">
      <dl className="flex flex-col gap-1 rounded-xl bg-surface px-3.5 py-2.5 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-subtle">{c.modelsLabel}</dt>
          <dd className="min-w-0 truncate text-foreground">{model}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-subtle">{c.keyStatusLabel}</dt>
          <dd className="text-foreground">
            {isSaved ? c.keyStatusSaved : c.keyStatusMissing}
          </dd>
        </div>
      </dl>
      <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2">
        <span className="min-w-0">
          <span className="block text-[15px] font-medium text-foreground md:text-sm">
            {fillCopy(c.switchLabel, { name: entry.name })}
          </span>
          <span className="block text-[13px] text-muted">
            {fillCopy(c.switchHint, { name: entry.name })}
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={fillCopy(c.switchLabel, { name: entry.name })}
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-foreground" : "bg-border"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-background transition-transform ${on ? "translate-x-5" : ""}`}
          />
        </button>
      </div>
      {refused && (
        <p role="alert" className="text-[13px] text-danger">
          {fillCopy(c.refusedRunning, { name: entry.name })}
        </p>
      )}
    </section>
  );
}
