"use client";

import { useState } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { useGitHubToken } from "@/features/github/use-github-token.ts";
import { useModelConfig } from "@/features/model/use-model-config.ts";
import { useSavedKeys } from "@/features/key-vault/use-saved-keys.ts";
import type { ConnectionId } from "../core/index.ts";
import {
  CONNECTIONS,
  findConnection,
  type ConnectionGroup,
} from "./connection-catalog.ts";
import { ConnectNotice } from "./ConnectNotice.tsx";
import { ConnectionDetail } from "./ConnectionDetail.tsx";
import { ConnectionRow } from "./ConnectionRow.tsx";
import { getConnectionsCopy } from "./connections-copy.ts";
import { useOffProviders } from "../switch/provider-switch-store.ts";
import { describeProviderState } from "../switch/provider-switch.ts";

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
  const { keys } = useSavedKeys();
  const gitHubToken = useGitHubToken();
  const activeConfig = useModelConfig();
  const offProviders = useOffProviders();
  const [openId, setOpenId] = useState<ConnectionId | null>(null);

  function isSaved(id: ConnectionId): boolean {
    return id === "github" ? Boolean(gitHubToken) : Boolean(keys[id]);
  }

  const body = openId ? (
    <ConnectionDetail
      key={openId}
      entry={findConnection(openId)}
      language={language}
      savedToken={openId === "github" ? gitHubToken : null}
      isSaved={isSaved(openId)}
      providerPage={{
        isOff: offProviders.includes(openId),
        activeConfig,
      }}
      showSecretLabel={showSecretLabel}
      hideSecretLabel={hideSecretLabel}
      onBack={() => setOpenId(null)}
    />
  ) : (
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
                  description={c.descriptions[entry.id]}
                  state={describeProviderState({
                    isSaved: isSaved(entry.id),
                    isInUse: activeConfig?.provider === entry.id,
                    isOff: offProviders.includes(entry.id),
                  })}
                  labels={{
                    notConfigured: c.connect,
                    connected: c.connected,
                    inUse: c.stateInUse,
                    off: c.stateOff,
                  }}
                  onOpen={() => setOpenId(entry.id)}
                />
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <ConnectNotice language={language} />
      {body}
    </div>
  );
}
