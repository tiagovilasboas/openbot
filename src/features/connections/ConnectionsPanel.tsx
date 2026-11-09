"use client";

import { useState } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { useGitHubToken } from "@/features/github/use-github-token.ts";
import { useModelConfig } from "@/features/model/use-model-config.ts";
import { useProviderKeys } from "@/features/model/use-provider-keys.ts";
import {
  CONNECTIONS,
  findConnection,
  type ConnectionGroup,
  type ConnectionId,
} from "./connection-catalog.ts";
import { ConnectionDetail } from "./ConnectionDetail.tsx";
import { ConnectionRow } from "./ConnectionRow.tsx";
import { getConnectionsCopy } from "./connections-copy.ts";

interface ConnectionsPanelProps {
  language: ChatLanguage;
  showSecretLabel: string;
  hideSecretLabel: string;
}

const GROUPS: readonly ConnectionGroup[] = ["models", "tools"];

/** A short list of services with their status; a tap opens just that one. */
export function ConnectionsPanel({
  language,
  showSecretLabel,
  hideSecretLabel,
}: ConnectionsPanelProps) {
  const c = getConnectionsCopy(language);
  const keys = useProviderKeys();
  const gitHubToken = useGitHubToken();
  const activeConfig = useModelConfig();
  const [openId, setOpenId] = useState<ConnectionId | null>(null);

  function savedKeyFor(id: ConnectionId): string | null {
    return id === "github" ? gitHubToken : (keys[id] ?? null);
  }

  if (openId) {
    return (
      <ConnectionDetail
        key={openId}
        entry={findConnection(openId)}
        language={language}
        savedKey={savedKeyFor(openId)}
        showSecretLabel={showSecretLabel}
        hideSecretLabel={hideSecretLabel}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-1.5">
          <h3 className="text-[13px] font-medium text-subtle">
            {group === "models" ? c.groupModels : c.groupTools}
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {CONNECTIONS.filter((entry) => entry.group === group).map(
              (entry) => (
                <ConnectionRow
                  key={entry.id}
                  name={entry.name}
                  description={
                    activeConfig?.provider === entry.id
                      ? c.inUse
                      : c.descriptions[entry.id]
                  }
                  isConnected={Boolean(savedKeyFor(entry.id))}
                  connectedLabel={c.connected}
                  connectLabel={c.connect}
                  onOpen={() => setOpenId(entry.id)}
                />
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
