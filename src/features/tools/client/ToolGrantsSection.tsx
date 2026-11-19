"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { loadBotsFromStorage, subscribeBots } from "../../bots/bot-storage.ts";
import type { BotProfile } from "../../bots/bot-types.ts";
import type { ChatLanguage } from "../../chat/respond-to-message.ts";
import { FORMAT_LOCALE } from "../../language/language.ts";
import {
  fetchGrants,
  revokeGrants,
  type RevokeTarget,
  type ToolGrant,
} from "./grants-api.ts";
import { grantsCopy } from "./grants-copy.ts";
import { toolLabel } from "./tools-copy.ts";

const NO_BOTS: BotProfile[] = [];
const getServerBots = () => NO_BOTS;

const BUTTON =
  "min-h-10 shrink-0 rounded-full px-3 text-sm font-medium text-danger transition-colors hover:bg-danger-soft active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

/**
 * The tools a bot may always use without asking. The grants live on the
 * server, where the tool turn reads them on every call: revoking here is what
 * makes the next call ask again.
 */
export function ToolGrantsSection({ language }: { language: ChatLanguage }) {
  const copy = grantsCopy[language];
  const bots = useSyncExternalStore(
    subscribeBots,
    loadBotsFromStorage,
    getServerBots,
  );
  const [grants, setGrants] = useState<ToolGrant[] | null>(null);
  const [failure, setFailure] = useState<"load" | "action" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    void fetchGrants().then((list) => {
      if (!current) return;
      setGrants(list);
      setFailure(list ? null : "load");
    });
    return () => {
      current = false;
    };
  }, []);

  async function revoke(target: RevokeTarget) {
    setBusy(true);
    const list = await revokeGrants(target);
    setBusy(false);
    if (list) {
      setGrants(list);
      setFailure(null);
    } else {
      setFailure("action");
    }
  }

  const dateFormat = new Intl.DateTimeFormat(FORMAT_LOCALE[language], {
    dateStyle: "medium",
  });
  const botName = (id: string) =>
    bots.find((bot) => bot.id === id)?.name ?? copy.unknownBot;

  return (
    <section
      aria-labelledby="grants-title"
      className="flex flex-col gap-2 md:gap-3"
    >
      <div>
        <h3 id="grants-title" className="text-sm font-semibold md:text-[15px]">
          {copy.title}
        </h3>
        <p className="text-xs text-subtle md:text-[13px]">{copy.description}</p>
      </div>

      {failure && (
        <p role="alert" className="text-[13px] text-danger">
          {failure === "load" ? copy.loadFailed : copy.actionFailed}
        </p>
      )}

      {grants && grants.length === 0 && (
        <p className="text-xs text-subtle md:text-[13px]">{copy.empty}</p>
      )}

      {grants && grants.length > 0 && (
        <>
          <ul className="flex flex-col gap-1.5 md:gap-2">
            {grants.map((grant) => {
              const tool = toolLabel(grant.toolName, language);
              const bot = botName(grant.botId);
              return (
                <li
                  key={`${grant.botId}:${grant.toolName}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-3 py-1.5 md:px-4 md:py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium md:text-[15px]">
                      {tool}
                    </p>
                    <p className="truncate text-xs text-subtle md:text-[13px]">
                      {bot} ·{" "}
                      {copy.grantedOn.replace(
                        "{date}",
                        dateFormat.format(grant.grantedAt),
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={copy.revokeOne
                      .replace("{tool}", tool)
                      .replace("{bot}", bot)}
                    onClick={() =>
                      void revoke({
                        botId: grant.botId,
                        toolName: grant.toolName,
                      })
                    }
                    className={BUTTON}
                  >
                    {copy.revoke}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void revoke({ all: true })}
              className={BUTTON}
            >
              {copy.revokeAll}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
