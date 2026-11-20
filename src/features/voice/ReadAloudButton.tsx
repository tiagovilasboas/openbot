"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Language } from "../language/language.ts";
import { SPEECH_LANG, speakableText } from "./voice-support.ts";
import { getVoiceCopy } from "./voice-copy.ts";

const noop = () => () => undefined;
const hasSynthesis = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

function SpeakerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

/** Reads one reply aloud with the browser's own voice; nothing leaves it. */
export function ReadAloudButton({
  text,
  language,
}: {
  text: string;
  language: Language;
}) {
  const supported = useSyncExternalStore(noop, hasSynthesis, () => false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(
    () => () => {
      if (speaking) window.speechSynthesis.cancel();
    },
    [speaking],
  );

  const spoken = speakableText(text);
  if (!supported || !spoken) return null;
  const copy = getVoiceCopy(language);
  const label = speaking ? copy.stopReading : copy.readAloud;

  function toggle() {
    const synth = window.speechSynthesis;
    synth.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = SPEECH_LANG[language];
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={speaking}
      className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full px-3 text-xs font-medium text-subtle transition-[color,background-color] duration-140 ease-out-expo hover:bg-surface hover:text-foreground md:min-h-11 md:min-w-11"
    >
      <SpeakerIcon />
    </button>
  );
}
