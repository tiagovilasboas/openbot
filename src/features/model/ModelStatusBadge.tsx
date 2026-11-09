"use client";

interface ModelStatusBadgeProps {
  label: string;
  isConfigured: boolean;
  onPress?: () => void;
  /** Names what pressing the pill does, for assistive tech. */
  actionLabel?: string;
  className?: string;
}

const PILL =
  "inline-flex h-8 min-w-0 max-w-64 items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs font-medium text-muted";

export function ModelStatusBadge({
  label,
  isConfigured,
  onPress,
  actionLabel,
  className = "",
}: ModelStatusBadgeProps) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${
          isConfigured ? "bg-success" : "bg-warning"
        }`}
      />
      <span className="truncate">{label}</span>
      {actionLabel && <span className="sr-only">, {actionLabel}</span>}
    </>
  );

  if (!onPress) {
    return (
      <span title={label} className={`${PILL} ${className}`}>
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      title={label}
      onClick={onPress}
      className={`${PILL} transition-[background-color,color,transform] duration-150 ease-out-expo hover:bg-surface-secondary hover:text-foreground active:scale-[0.97] ${className}`}
    >
      {body}
    </button>
  );
}
