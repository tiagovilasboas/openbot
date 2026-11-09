"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const FEEDBACK_MS = 1500;

export function useCopyToClipboard(text: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), FEEDBACK_MS);
    } catch {
      setCopied(false);
    }
  }, [text]);

  const canCopy = typeof navigator !== "undefined" && !!navigator.clipboard;

  return { copied, copy, canCopy };
}
