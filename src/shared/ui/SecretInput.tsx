"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "./FieldIcons.tsx";
import { FIELD_CLASS, type FieldControlProps } from "./FormField.tsx";

interface SecretInputProps extends FieldControlProps {
  value: string;
  onChange: (value: string) => void;
  showLabel: string;
  hideLabel: string;
  placeholder?: string;
  autoComplete?: string;
}

/** Password-type input with a 44px show/hide toggle. */
export function SecretInput({
  value,
  onChange,
  showLabel,
  hideLabel,
  placeholder,
  autoComplete = "off",
  ...aria
}: SecretInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...aria}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        className={`${FIELD_CLASS} pe-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-xl text-muted transition-colors hover:text-foreground active:scale-[0.97]"
      >
        {visible ? (
          <EyeOffIcon className="size-5" />
        ) : (
          <EyeIcon className="size-5" />
        )}
      </button>
    </div>
  );
}
