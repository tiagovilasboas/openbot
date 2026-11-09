import { useId, type ReactNode } from "react";
import { AlertIcon } from "./FieldIcons.tsx";

/** Shared control look: 48px tall, 16px on phone, 14px on desktop. */
export const FIELD_CLASS =
  "w-full min-h-12 rounded-xl border border-border bg-surface px-3.5 text-base text-foreground placeholder:text-subtle md:text-sm disabled:pointer-events-none disabled:opacity-40";

export const TEXTAREA_CLASS = `${FIELD_CLASS} min-h-24 resize-none py-3 leading-relaxed`;

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

/** Label (14px medium) + control + helper (13px) or error (text-danger). */
export function FormField({ label, helper, error, children }: FormFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const hasNote = Boolean(error || helper);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[15px] font-medium text-foreground md:text-sm"
      >
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
          className="flex items-start gap-1.5 text-[13px] text-danger"
        >
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helper ? (
        <p id={noteId} className="text-[13px] text-subtle">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
