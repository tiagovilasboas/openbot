"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Language } from "../language/language.ts";
import {
  finalTranscript,
  recognizerConstructor,
  type Recognizer,
} from "./speech-recognition.ts";
import { SPEECH_LANG } from "./voice-support.ts";
import { getVoiceCopy } from "./voice-copy.ts";

const noop = () => () => undefined;

function MicIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </svg>
  );
}

/** Speech to text in the browser; hidden where the API does not exist. */
export function DictateButton({
  language,
  onHeard,
}: {
  language: Language;
  /** Each finished phrase, to append to the draft. */
  onHeard: (text: string) => void;
}) {
  const supported = useSyncExternalStore(
    noop,
    () => recognizerConstructor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const recognizerRef = useRef<Recognizer | null>(null);
  const onHeardRef = useRef(onHeard);
  useEffect(() => {
    onHeardRef.current = onHeard;
  }, [onHeard]);
  useEffect(() => () => recognizerRef.current?.stop(), []);

  if (!supported) return null;
  const copy = getVoiceCopy(language);
  const label = listening ? copy.stopDictation : copy.dictate;

  function toggle() {
    if (listening) {
      recognizerRef.current?.stop();
      return;
    }
    const Ctor = recognizerConstructor();
    if (!Ctor) return;
    const recognizer = new Ctor();
    recognizer.lang = SPEECH_LANG[language];
    recognizer.interimResults = false;
    recognizer.continuous = true;
    recognizer.onresult = (event) => {
      const text = finalTranscript(event);
      if (text.trim()) onHeardRef.current(text);
    };
    recognizer.onend = () => setListening(false);
    recognizer.onerror = () => setListening(false);
    recognizerRef.current = recognizer;
    try {
      recognizer.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={listening}
      onMouseDown={(event) => event.preventDefault()}
      onClick={toggle}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full md:size-11 transition-[background-color,color] duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary hover:text-foreground ${
        listening ? "bg-surface-secondary text-danger" : "text-muted"
      }`}
    >
      <MicIcon />
    </button>
  );
}
