import type { Language } from "../language/language.ts";

interface VoiceCopy {
  dictate: string;
  stopDictation: string;
  readAloud: string;
  stopReading: string;
}

const COPY: Record<Language, VoiceCopy> = {
  pt: {
    dictate: "Ditar mensagem",
    stopDictation: "Parar de ditar",
    readAloud: "Ler em voz alta",
    stopReading: "Parar leitura",
  },
  en: {
    dictate: "Dictate message",
    stopDictation: "Stop dictating",
    readAloud: "Read aloud",
    stopReading: "Stop reading",
  },
  es: {
    dictate: "Dictar mensaje",
    stopDictation: "Dejar de dictar",
    readAloud: "Leer en voz alta",
    stopReading: "Detener lectura",
  },
};

export function getVoiceCopy(language: Language): VoiceCopy {
  return COPY[language];
}
