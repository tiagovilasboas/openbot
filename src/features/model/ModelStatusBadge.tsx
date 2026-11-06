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
      className={`max-w-48 truncate sm:max-w-xs ${
        onPress
          ? "cursor-pointer transition-opacity hover:opacity-80 active:opacity-60"
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
            isConfigured ? "bg-success" : "bg-warning"
          }`}
          aria-hidden="true"
        />
        <span className="truncate text-xs font-medium">{label}</span>
      </span>
    </Chip>
  );
}
