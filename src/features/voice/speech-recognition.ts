// The browser's speech recognition, typed loosely: the API is prefixed in
// Safari and Chrome and missing in Firefox, so callers must handle null.

export type Recognizer = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};

type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type RecognizerConstructor = new () => Recognizer;

export function recognizerConstructor(): RecognizerConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof ctor === "function" ? (ctor as RecognizerConstructor) : null;
}

/** The final text of one result event; interim guesses are skipped. */
export function finalTranscript(event: RecognitionResultEvent): string {
  let text = "";
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    if (result.isFinal) text += result[0].transcript;
  }
  return text;
}
