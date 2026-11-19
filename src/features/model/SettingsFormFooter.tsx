import { SheetFooter } from "@/shared/ui/ResponsiveSheet.tsx";
import type { chatCopy } from "@/features/chat/chat-copy.ts";
import type { getSettingsCopy } from "./settings-copy.ts";

interface SettingsFormFooterProps {
  s: ReturnType<typeof getSettingsCopy>;
  content: (typeof chatCopy)[keyof typeof chatCopy];
  /** True while the reset asks to be confirmed. */
  isConfirming: boolean;
  onConfirmingChange: (confirming: boolean) => void;
  onReset: () => void;
  onSave: () => void;
  /** True while the chosen provider is switched off. */
  saveDisabled: boolean;
}

/** Save, and reset with a confirm step, at the foot of the Model form. */
export function SettingsFormFooter({
  s,
  content,
  isConfirming,
  onConfirmingChange,
  onReset,
  onSave,
  saveDisabled,
}: SettingsFormFooterProps) {
  return (
    <SheetFooter>
      {isConfirming ? (
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {s.resetConfirm}
            </p>
            <p className="text-xs text-subtle md:text-[13px]">
              {s.resetConfirmHint}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onConfirmingChange(false)}
              className="min-h-10 flex-1 rounded-full border border-border bg-surface px-5 text-sm font-medium text-foreground active:scale-[0.97] md:flex-none"
            >
              {s.cancel}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="min-h-10 flex-1 rounded-full bg-danger px-5 text-sm font-medium text-background active:scale-[0.97] md:flex-none"
            >
              {s.resetConfirmAction}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onConfirmingChange(true)}
            className="min-h-10 rounded-full px-4 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground active:scale-[0.97]"
          >
            {content.resetDefaults}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="min-h-10 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            {content.saveSettings}
          </button>
        </div>
      )}
    </SheetFooter>
  );
}
