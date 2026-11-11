import { describePromptBudget } from "./prompt-budget-copy.ts";
import type { PromptBudgetReport } from "./prompt-budget.ts";

/**
 * Says what the bot's built prompt would lose. The region is always rendered
 * so a screen reader announces it when it fills; the warning mark and the
 * words carry the meaning, not the color.
 */
export function PromptBudgetNotice({
  report,
  isPt,
}: {
  report: PromptBudgetReport;
  isPt: boolean;
}) {
  const message = describePromptBudget(report, isPt ? "pt" : "en");
  return (
    <div role="status" aria-live="polite">
      {message && (
        <div className="rounded-xl border border-warning bg-warning-soft px-3.5 py-2.5 text-[13px] text-foreground">
          <p className="font-medium">
            <span aria-hidden="true">⚠ </span>
            {message.title}
          </p>
          {message.losses.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {message.losses.map((loss) => (
                <li key={loss}>{loss}</li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-muted">{message.overBy}</p>
          <p className="text-muted">{message.hint}</p>
        </div>
      )}
    </div>
  );
}
