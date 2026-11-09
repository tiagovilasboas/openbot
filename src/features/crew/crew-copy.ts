import type { ChatLanguage } from "../chat/respond-to-message.ts";

/** The literal keyword the Chief writes to hand a task to a crew member. */
export const DELEGATE_KEYWORD = "@delegate";

interface CrewCopy {
  rosterHeader: string;
  noSkills: string;
  delegationRules: string;
  antiLoopRule: string;
  userAsked: string;
  yourTask: string;
  synthesisRule: string;
  synthesisRequest: string;
  delegatingTo: (names: string[]) => string;
  specialistFailed: (name: string) => string;
  synthesisFailed: string;
}

/** Prompt and UI text for the Chief's crew, in both supported languages. */
export const crewCopy: Record<ChatLanguage, CrewCopy> = {
  pt: {
    rosterHeader:
      "Sua equipe (outros bots que você conhece e pode acionar pelo nome):",
    noSkills: "sem skills",
    delegationRules: [
      "Para passar uma tarefa a alguém da equipe, escreva uma linha por tarefa, sozinha na linha, exatamente assim:",
      `${DELEGATE_KEYWORD} Engineering: <tarefa completa, que se entende sozinha>`,
      "Regras: no máximo 3 linhas; só delegue quando o especialista agregar algo real; nunca delegue para você mesmo; depois dessas linhas não escreva mais nada.",
      "Você vai receber as respostas e então escreverá a resposta final ao usuário. Se puder responder sozinho, responda direto, sem " +
        DELEGATE_KEYWORD +
        ".",
    ].join("\n"),
    antiLoopRule:
      "[Regra Anti-Loop]: Responda estritamente com o conteúdo solicitado. Nunca envie mensagens só de agradecimento, confirmação ou cortesia. Não delegue para outros bots.",
    userAsked: "Pedido original do usuário",
    yourTask: "Sua tarefa, enviada pelo Chief of Staff",
    synthesisRule:
      "Agora escreva a resposta final ao usuário a partir das respostas dos especialistas. Não delegue de novo e não escreva " +
      DELEGATE_KEYWORD +
      ".",
    synthesisRequest: "Respostas dos especialistas:",
    delegatingTo: (names) => `Delegando para ${names.join(", ")}.`,
    specialistFailed: (name) => `${name} não conseguiu responder desta vez.`,
    synthesisFailed:
      "Não consegui juntar as respostas agora; veja o que cada especialista disse acima.",
  },
  en: {
    rosterHeader: "Your crew (other bots you know and can call by name):",
    noSkills: "no skills",
    delegationRules: [
      "To hand a task to a crew member, write one line per task, alone on its line, exactly like this:",
      `${DELEGATE_KEYWORD} Engineering: <the full task, understandable on its own>`,
      "Rules: at most 3 lines; delegate only when the specialist adds something real; never delegate to yourself; write nothing after those lines.",
      "You will receive their answers and then write the final reply to the user. If you can answer alone, answer directly without " +
        DELEGATE_KEYWORD +
        ".",
    ].join("\n"),
    antiLoopRule:
      "[Anti-Loop Rule]: Answer strictly with the requested content. Never send thank-you, acknowledgement-only or courtesy messages. Do not delegate to other bots.",
    userAsked: "The user's original request",
    yourTask: "Your task, sent by the Chief of Staff",
    synthesisRule:
      "Now write the final reply to the user from the specialists' answers. Do not delegate again and do not write " +
      DELEGATE_KEYWORD +
      ".",
    synthesisRequest: "Specialists' answers:",
    delegatingTo: (names) => `Delegating to ${names.join(", ")}.`,
    specialistFailed: (name) => `${name} could not answer this time.`,
    synthesisFailed:
      "I could not combine the answers right now; see what each specialist said above.",
  },
};
