"use client";

import { Chip } from "@heroui/react";

interface ModelStatusBadgeProps {
  label: string;
  isConfigured: boolean;
  onPress?: () => void;
}

export function ModelStatusBadge({
  label,
  isConfigured,
  onPress,
}: ModelStatusBadgeProps) {
  return (
    <Chip
      size="sm"
      variant="soft"
      color={isConfigured ? "success" : "warning"}
      className={`max-w-[70px] xs:max-w-[110px] sm:max-w-xs truncate border border-white/10 bg-zinc-900/60 text-zinc-300 px-1.5 sm:px-2.5 ${
        onPress
          ? "cursor-pointer transition-all hover:border-white/25 hover:bg-zinc-800 hover:text-white active:scale-95"
          : ""
      }`}
      onClick={onPress}
      aria-label={`Status: ${label}`}
      role={onPress ? "button" : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={
        onPress
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPress();
              }
            }
          : undefined
      }
    >
      <span className="flex items-center gap-1.5 truncate">
        <span
          className={`inline-block size-1.5 shrink-0 rounded-full ${
            isConfigured ? "bg-emerald-400" : "bg-amber-400"
          }`}
          aria-hidden="true"
        />
        <span className="truncate text-[11px] sm:text-xs font-medium">
          {label}
        </span>
      </span>
    </Chip>
  );
}
