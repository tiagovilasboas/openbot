"use client";

import { useRef, type KeyboardEvent } from "react";

export type SettingsTabId = "model" | "connections" | "security" | "usage";

export interface SettingsTabItem {
  id: SettingsTabId;
  label: string;
  /** Optional count or status shown after the label. */
  badge?: string;
}

interface SettingsTabsProps {
  label: string;
  tabs: SettingsTabItem[];
  active: SettingsTabId;
  onChange: (id: SettingsTabId) => void;
}

/** Full-width segmented control with tablist semantics and arrow-key roving. */
export function SettingsTabs({
  label,
  tabs,
  active,
  onChange,
}: SettingsTabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(event: KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + step + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="grid gap-1 rounded-2xl bg-surface p-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={`settings-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls="settings-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium transition-colors active:scale-[0.97] ${
              selected
                ? "bg-surface-tertiary text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span className="truncate">{tab.label}</span>
            {tab.badge && (
              <span className="rounded-full bg-bot-accent-soft px-1.5 text-xs font-medium tabular-nums text-bot-accent">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
