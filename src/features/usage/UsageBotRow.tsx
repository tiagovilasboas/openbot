"use client";

import { BotAvatar } from "../bots/BotAvatar.tsx";
import type { BotProfile } from "../bots/bot-types.ts";
import type { UsageCopy } from "./usage-copy.ts";
import type { UsageTotals } from "./usage-record.ts";
import { UsageResetControl } from "./UsageResetControl.tsx";

interface UsageBotRowProps {
  bot: BotProfile;
  copy: UsageCopy;
  format: (value: number) => string;
  total: UsageTotals;
  lastSevenDays: UsageTotals;
  onReset: () => void;
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function Tokens({
  copy,
  format,
  totals,
}: {
  copy: UsageCopy;
  format: (value: number) => string;
  totals: UsageTotals;
}) {
  return (
    <span className="tabular-nums">
      {format(totals.inputTokens)} {copy.input} · {format(totals.outputTokens)}{" "}
      {copy.output}
      {totals.costUsd !== undefined && totals.costUsd > 0 && (
        <span className="text-muted">
          {" "}
          · {usdFormatter.format(totals.costUsd)}
        </span>
      )}
    </span>
  );
}

/** One bot: what it used in total and over the last week, with its own reset. */
export function UsageBotRow({
  bot,
  copy,
  format,
  total,
  lastSevenDays,
  onReset,
}: UsageBotRowProps) {
  return (
    <li className="flex flex-col gap-1 rounded-2xl bg-surface px-3 py-2 md:gap-2 md:p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <BotAvatar
            shape={bot.avatarShape}
            color={bot.avatarColor}
            size={28}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground md:text-[15px]">
              {bot.name}
            </span>
            {total.calls === 0 && (
              <span className="block truncate text-xs text-subtle md:text-[13px]">
                {copy.noReplies}
              </span>
            )}
          </span>
        </span>
        <UsageResetControl
          label={copy.reset(bot.name)}
          text={copy.resetShort}
          question={copy.confirmBot}
          confirmLabel={copy.confirmAction}
          cancelLabel={copy.cancel}
          disabled={total.calls === 0}
          onConfirm={onReset}
        />
      </div>
      {total.calls > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs md:gap-x-4 md:gap-y-1 md:text-[13px]">
          <dt className="text-muted">{copy.total}</dt>
          <dd className="text-foreground">
            <Tokens copy={copy} format={format} totals={total} />
            <span className="text-muted"> · {copy.replies(total.calls)}</span>
          </dd>
          <dt className="text-muted">{copy.lastSevenDays}</dt>
          <dd className="text-foreground">
            <Tokens copy={copy} format={format} totals={lastSevenDays} />
          </dd>
        </dl>
      )}

      {total.callsWithoutUsage > 0 && (
        <p className="text-xs text-subtle md:text-[13px]">
          {copy.withoutData(total.callsWithoutUsage)}
        </p>
      )}
    </li>
  );
}
