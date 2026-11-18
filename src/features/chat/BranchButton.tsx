"use client";

interface BranchButtonProps {
  label: string;
  hint?: string;
  disabled: boolean;
  onClick: () => void;
}

/** "Branch from here": icon and label, quiet like the copy button beside it. */
export function BranchButton({
  label,
  hint,
  disabled,
  onClick,
}: BranchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint ?? label}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium text-subtle transition-[color,background-color,transform] duration-140 ease-out-expo hover:bg-surface hover:text-foreground active:scale-[0.97] disabled:opacity-50"
    >
      <svg
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        <circle cx="6" cy="5" r="2" />
        <circle cx="6" cy="19" r="2" />
        <circle cx="18" cy="9" r="2" />
        <path d="M6 7v10M18 11c0 4-6 3-12 6" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
