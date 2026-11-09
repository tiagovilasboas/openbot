"use client";

import { useEffect, useRef } from "react";
import { TEXTAREA_CLASS } from "@/shared/ui/FormField.tsx";

/** Textarea that grows with its content (sheet body scrolls, not the field). */
export function AutoTextarea({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  "aria-describedby"?: string;
  minRows: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { minRows, ...props } = rest;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={TEXTAREA_CLASS}
      style={{ minHeight: `${minRows * 1.625 + 1.5}rem` }}
    />
  );
}
