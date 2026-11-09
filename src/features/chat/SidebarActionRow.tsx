import type { ReactNode } from "react";

interface SidebarActionRowProps {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Primary rows (New chat) read in the foreground color. */
  emphasis?: boolean;
}

/** A 44px+ sidebar row: icon slot aligned with 32px bot avatars, then label. */
export function SidebarActionRow({
  icon,
  label,
  onPress,
  disabled,
  emphasis,
}: SidebarActionRowProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium transition-[background-color,color,transform] duration-150 ease-out-expo hover:bg-surface hover:text-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 md:text-sm ${
        emphasis ? "text-foreground" : "text-muted"
      }`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
