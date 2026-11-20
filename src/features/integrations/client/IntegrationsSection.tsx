"use client";

import { useCallback, useEffect, useState } from "react";
import type { Language } from "../../language/language.ts";
import { withApiHeaders } from "../../server-guard/api-request-init.ts";
import type { IntegrationsStatus } from "../server/integrations-status.ts";
import { getIntegrationsCopy } from "./integrations-copy.ts";

type State =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "ready"; status: IntegrationsStatus };

async function fetchStatus(): Promise<State> {
  try {
    const response = await fetch("/api/integrations/status", withApiHeaders());
    if (!response.ok) return { kind: "failed" };
    return {
      kind: "ready",
      status: (await response.json()) as IntegrationsStatus,
    };
  } catch {
    return { kind: "failed" };
  }
}

const ROW = "flex items-center justify-between gap-3 py-1.5 text-sm";

/** MCP servers and the Telegram bridge, as the server sees them now. */
export function IntegrationsSection({ language }: { language: Language }) {
  const c = getIntegrationsCopy(language);
  const [state, setState] = useState<State>({ kind: "loading" });

  const refresh = useCallback(async () => {
    setState({ kind: "loading" });
    setState(await fetchStatus());
  }, []);

  useEffect(() => {
    let live = true;
    void fetchStatus().then((next) => {
      if (live) setState(next);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section aria-label={c.title} className="mt-4 flex flex-col gap-2 md:mt-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-foreground">{c.title}</h3>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={state.kind === "loading"}
          className="min-h-9 rounded-full px-3 text-xs font-medium text-muted hover:text-foreground disabled:opacity-50"
        >
          {c.refresh}
        </button>
      </div>
      <p className="text-xs text-muted md:text-[13px]">{c.note}</p>
      {state.kind === "loading" && (
        <p className="text-xs text-subtle">{c.loading}</p>
      )}
      {state.kind === "failed" && (
        <p role="alert" className="text-xs text-danger">
          {c.failed}
        </p>
      )}
      {state.kind === "ready" && (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border px-3">
          <div className="py-2">
            <p className="text-[13px] font-medium text-foreground">
              {c.mcpTitle}
            </p>
            {state.status.mcp.configError && (
              <p role="alert" className="text-xs text-danger">
                {c.mcpConfigError(state.status.mcp.configError)}
              </p>
            )}
            {!state.status.mcp.configError &&
              state.status.mcp.servers.length === 0 && (
                <p className="text-xs text-subtle">{c.mcpNone}</p>
              )}
            {state.status.mcp.servers.map((server) => (
              <div key={server.name} className={ROW}>
                <span className="min-w-0 truncate">
                  {server.name}{" "}
                  <span className="text-xs text-subtle">{server.host}</span>
                </span>
                <span
                  className={`shrink-0 text-xs ${server.result.ok ? "text-muted" : "text-danger"}`}
                >
                  {server.result.ok
                    ? c.mcpTools(server.result.tools)
                    : c.mcpError(server.result.code)}
                </span>
              </div>
            ))}
          </div>
          <div className={ROW}>
            <span className="text-[13px] font-medium">{c.telegramTitle}</span>
            <span className="text-xs text-muted">
              {state.status.telegram.enabled
                ? c.telegramOn(state.status.telegram.allowedChats)
                : state.status.telegram.problem
                  ? c.telegramProblem(state.status.telegram.problem)
                  : c.telegramOff}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
