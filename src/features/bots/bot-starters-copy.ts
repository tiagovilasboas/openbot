import type { Language } from "../language/language.ts";

/** Starter task templates; `{role}` and `{skill}` are filled in. */
interface StartersCopy {
  groupLabel: string;
  introduce: string;
  roleTask: string;
  fallbackTask: string;
  skillTask: string;
  planTask: string;
}

const STARTERS_COPY: Record<Language, StartersCopy> = {
  pt: {
    groupLabel: "Primeiras tarefas sugeridas",
    introduce: "Apresente-se: o que você faz e como pode me ajudar?",
    roleTask: "Como você me ajuda com {role}? Mostre um exemplo prático.",
    fallbackTask: "Quais informações você precisa sobre o meu projeto?",
    skillTask: "Mostre como usar a habilidade {skill} em um exemplo.",
    planTask: "Monte um plano para eu começar a trabalhar com você hoje.",
  },
  en: {
    groupLabel: "Suggested first tasks",
    introduce: "Introduce yourself: what do you do and how can you help me?",
    roleTask: "How do you help me with {role}? Show a practical example.",
    fallbackTask: "What do you need to know about my project?",
    skillTask: "Show how to use the {skill} skill in an example.",
    planTask: "Draft a plan so I can start working with you today.",
  },
  es: {
    groupLabel: "Primeras tareas sugeridas",
    introduce: "Preséntate: ¿qué haces y cómo puedes ayudarme?",
    roleTask: "¿Cómo me ayudas con {role}? Muestra un ejemplo práctico.",
    fallbackTask: "¿Qué necesitas saber sobre mi proyecto?",
    skillTask: "Muestra cómo usar la habilidad {skill} en un ejemplo.",
    planTask: "Arma un plan para que empiece a trabajar contigo hoy.",
  },
};

export function getStartersCopy(language: Language): StartersCopy {
  return STARTERS_COPY[language];
}
