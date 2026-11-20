import type { Language } from "../language/language.ts";

interface SideQuestionCopy {
  open: string;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  ask: string;
  asking: string;
  close: string;
  failed: string;
  noModel: string;
}

const COPY: Record<Language, SideQuestionCopy> = {
  pt: {
    open: "Pergunta lateral",
    title: "Pergunta lateral",
    description:
      "Pergunte sobre a conversa sem mexer nela. Nada daqui fica no histórico.",
    label: "Sua pergunta",
    placeholder: "Ex.: o que foi decidido até agora?",
    ask: "Perguntar",
    asking: "Perguntando…",
    close: "Fechar",
    failed: "Não deu para responder agora. Tente de novo.",
    noModel: "Conecte um modelo para fazer perguntas laterais.",
  },
  en: {
    open: "Side question",
    title: "Side question",
    description:
      "Ask about the conversation without changing it. Nothing here is kept in the history.",
    label: "Your question",
    placeholder: "E.g. what has been decided so far?",
    ask: "Ask",
    asking: "Asking…",
    close: "Close",
    failed: "Could not answer right now. Try again.",
    noModel: "Connect a model to ask side questions.",
  },
  es: {
    open: "Pregunta lateral",
    title: "Pregunta lateral",
    description:
      "Pregunta sobre la conversación sin cambiarla. Nada de aquí queda en el historial.",
    label: "Tu pregunta",
    placeholder: "Ej.: ¿qué se decidió hasta ahora?",
    ask: "Preguntar",
    asking: "Preguntando…",
    close: "Cerrar",
    failed: "No se pudo responder ahora. Inténtalo de nuevo.",
    noModel: "Conecta un modelo para hacer preguntas laterales.",
  },
};

export function getSideQuestionCopy(language: Language): SideQuestionCopy {
  return COPY[language];
}
