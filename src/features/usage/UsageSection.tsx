"use client";

import { FORMAT_LOCALE } from "../language/language.ts";
import { useMemo, useSyncExternalStore } from "react";
import { loadBotsFromStorage, subscribeBots } from "../bots/bot-storage.ts";
import type { BotProfile } from "../bots/bot-types.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { getUsageCopy } from "./usage-copy.ts";
import { localDay } from "./usage-day.ts";
import { lastSevenDays, totalForBot } from "./usage-record.ts";
import { clearAllUsage, clearBotUsage } from "./usage-storage.ts";
import { UsageBotRow } from "./UsageBotRow.tsx";
import { UsageResetControl } from "./UsageResetControl.tsx";
import { useUsage } from "./use-usage.ts";

const NO_BOTS: BotProfile[] = [];
const getServerBots = () => NO_BOTS;

/**
 * Tokens used per bot, from what the providers reported and kept only on this
 * device. Replies the provider gave no counts for are counted apart and shown
 * as such: nothing here is an estimate.
 */
export function UsageSection({ language }: { language: ChatLanguage }) {
  const copy = getUsageCopy(language);
  const bots = useSyncExternalStore(
    subscribeBots,
    loadBotsFromStorage,
    getServerBots,
  );
  const records = useUsage();
  const format = useMemo(() => {
    const formatter = new Intl.NumberFormat(FORMAT_LOCALE[language]);
    return (value: number) => formatter.format(value);
  }, [language]);
  const today = localDay(new Date());

  return (
    <section aria-labelledby="usage-title" className="flex flex-col gap-4">
      <div>
        <h3 id="usage-title" className="text-[15px] font-semibold">
          {copy.title}
        </h3>
        <p className="text-[13px] text-subtle">{copy.description}</p>
        <p className="mt-1 text-[13px] text-subtle">{copy.deviceNote}</p>
      </div>

      {bots.length === 0 ? (
        <p className="text-[13px] text-subtle">{copy.noBots}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bots.map((bot) => (
            <UsageBotRow
              key={bot.id}
              bot={bot}
              copy={copy}
              format={format}
              total={totalForBot(records, bot.id)}
              lastSevenDays={lastSevenDays(records, bot.id, today)}
              onReset={() => clearBotUsage(bot.id)}
            />
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <UsageResetControl
          label={copy.resetAll}
          question={copy.confirmAll}
          confirmLabel={copy.confirmAction}
          cancelLabel={copy.cancel}
          disabled={records.length === 0}
          onConfirm={clearAllUsage}
        />
      </div>
    </section>
  );
}
