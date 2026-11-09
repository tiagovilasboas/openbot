"use client";

import { AlertIcon, CheckIcon, SpinnerIcon } from "@/shared/ui/FieldIcons.tsx";

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

interface ConnectionTestProps {
  label: string;
  loadingLabel: string;
  isTesting: boolean;
  result: ConnectionTestResult | null;
  idleHint?: string;
  onTest: () => void;
}

/** Secondary button with loading state, and a live result row below it. */
export function ConnectionTest({
  label,
  loadingLabel,
  isTesting,
  result,
  idleHint,
  onTest,
}: ConnectionTestProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onTest}
        disabled={isTesting}
        aria-busy={isTesting}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:text-sm"
      >
        {isTesting && <SpinnerIcon className="size-4" />}
        {isTesting ? loadingLabel : label}
      </button>
      <div role="status" aria-live="polite">
        {result ? (
          <p
            className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px] ${
              result.ok
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger"
            }`}
          >
            {result.ok ? (
              <CheckIcon className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertIcon className="mt-0.5 size-4 shrink-0" />
            )}
            <span className="min-w-0 break-words">{result.message}</span>
          </p>
        ) : idleHint ? (
          <p className="text-[13px] text-subtle">{idleHint}</p>
        ) : null}
      </div>
    </div>
  );
}
