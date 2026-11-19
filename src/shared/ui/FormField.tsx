import { useId, type ReactNode } from "react";
import { AlertIcon } from "./FieldIcons.tsx";

/** Shared control look: 40px tall. 16px text on phone stops iOS zoom on focus. */
export const FIELD_CLASS =
  "w-full min-h-10 rounded-xl border border-border bg-surface px-3 text-base text-foreground placeholder:text-subtle md:text-sm disabled:pointer-events-none disabled:opacity-40";

export const TEXTAREA_CLASS = `${FIELD_CLASS.replace("min-h-10", "min-h-20")} resize-none py-2 leading-relaxed`;

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

interface FormFieldProps {
  label: string;
  helper?: string;
  error?: string | null;
  children: (control: FieldControlProps) => ReactNode;
}

/** Label (14px medium) + control + helper (12px, 13px from md:) or error. */
export function FormField({ label, helper, error, children }: FormFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const hasNote = Boolean(error || helper);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children({
        id,
        ...(hasNote ? { "aria-describedby": noteId } : {}),
        ...(error ? { "aria-invalid": true as const } : {}),
      })}
      {error ? (
        <p
          id={noteId}
          role="alert"
          className="flex items-start gap-1.5 text-xs text-danger md:text-[13px]"
        >
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helper ? (
        <p id={noteId} className="text-xs text-subtle md:text-[13px]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
