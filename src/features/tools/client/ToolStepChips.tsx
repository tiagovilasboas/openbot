"use client";

import type { Language } from "@/features/language/language.ts";
import type { LiveToolStep } from "./live-tool-steps.ts";
import { ASK_USER } from "../ask-user.ts";
import { askUserCopy } from "./ask-user-copy.ts";
import { toolLabel, toolsCopy } from "./tools-copy.ts";

/** An answered question keeps the answer on its chip; others keep the status. */
function stepText(step: ChipStep, language: Language): string {
  const status = toolsCopy[language].stepStatus[step.status];
  if (step.name !== ASK_USER || step.status !== "ok" || !step.summary) {
    return status;
  }
  return askUserCopy[language].answered.replace("{answer}", step.summary);
}

type ChipStep = Pick<LiveToolStep, "name" | "status"> & { summary?: string };

const DOT: Record<LiveToolStep["status"], string> = {
  ok: "bg-success",
  error: "bg-danger",
  denied: "bg-subtle",
  expired: "bg-subtle",
  running: "bg-bot-accent",
  pending: "bg-warning",
};

/** The tool calls of a reply, one quiet chip each: what and how it went. */
export function ToolStepChips({
  steps,
  language,
}: {
  steps: readonly ChipStep[];
  language: Language;
}) {
  if (steps.length === 0) return null;
  const copy = toolsCopy[language];
  return (
    <ul aria-label={copy.stepsLabel} className="flex flex-wrap gap-1.5">
      {steps.map((step, index) => (
        <li
          key={`${step.name}-${index}`}
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted"
        >
          <span
            aria-hidden="true"
            className={`size-1.5 shrink-0 rounded-full ${DOT[step.status]}`}
          />
          <span className="font-medium text-foreground">
            {toolLabel(step.name, language)}
          </span>
          <span className="min-w-0 break-words">
            · {stepText(step, language)}
          </span>
        </li>
      ))}
    </ul>
  );
}
