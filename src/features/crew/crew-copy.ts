import type { ChatLanguage } from "../chat/respond-to-message.ts";

/** The literal keyword the Chief writes to hand a task to a crew member. */
export const DELEGATE_KEYWORD = "@delegate";

/**
 * The user's chosen language decides the language of every answer in a crew
 * turn, whatever language the request, the task or a specialist's text uses.
 */
const ANSWER_LANGUAGE_RULE: Record<ChatLanguage, string> = {
  pt: "Escreva sempre em português do Brasil, o idioma escolhido pelo usuário, mesmo que o pedido, a tarefa ou o texto dos especialistas esteja em outro idioma.",
  en: "Always write in English, the language the user chose, even if the request, the task or the specialists' text is in another language.",
  es: "Escribe siempre en español latinoamericano neutro, el idioma que eligió el usuario, aunque la solicitud, la tarea o el texto de los especialistas estén en otro idioma.",
};

interface CrewCopy {
  rosterHeader: string;
  noSkills: string;
  /** How to delegate, with a real crew member's name in the example. */
  delegationRules: (exampleName: string) => string;
  antiLoopRule: string;
  userAsked: string;
  yourTask: string;
  synthesisRule: string;
  synthesisRequest: string;
  delegatingTo: (names: string[]) => string;
  specialistFailed: (name: string) => string;
  synthesisFailed: string;
  /** Shown when the Chief named a bot that is not on the crew. */
  delegateNotFound: string;
  /**
   * Tells the Chief, outside the wrapped specialist text, that this answer
   * was cut off and may be missing its end.
   */
  specialistCut: string;
}

/** Prompt and UI text for the Chief's crew, in every supported language. */
export const crewCopy: Record<ChatLanguage, CrewCopy> = {
  pt: {
    rosterHeader:
      "Sua equipe (outros bots que você conhece e pode acionar pelo nome):",
    noSkills: "sem skills",
    delegationRules: (exampleName) =>
      [
        "Para passar uma tarefa a alguém da equipe, escreva uma linha por tarefa, sozinha na linha, exatamente assim:",
        `${DELEGATE_KEYWORD} ${exampleName}: <tarefa completa, que se entende sozinha>`,
        "Regras: no máximo 3 linhas; só delegue quando o especialista agregar algo real; nunca delegue para você mesmo; depois dessas linhas não escreva mais nada.",
        "Você vai receber as respostas e então escreverá a resposta final ao usuário. Se puder responder sozinho, responda direto, sem " +
          DELEGATE_KEYWORD +
          ".",
        ANSWER_LANGUAGE_RULE.pt,
      ].join("\n"),
    antiLoopRule:
      "[Regra Anti-Loop]: Responda estritamente com o conteúdo solicitado. Nunca envie mensagens só de agradecimento, confirmação ou cortesia. Não delegue para outros bots. " +
      ANSWER_LANGUAGE_RULE.pt,
    userAsked: "Pedido original do usuário",
    yourTask: "Sua tarefa, enviada pelo Chief of Staff",
    synthesisRule:
      "Agora escreva a resposta final ao usuário a partir das respostas dos especialistas. Não delegue de novo e não escreva " +
      DELEGATE_KEYWORD +
      ". " +
      ANSWER_LANGUAGE_RULE.pt,
    synthesisRequest: "Respostas dos especialistas:",
    delegatingTo: (names) => `Delegando para ${names.join(", ")}.`,
    specialistFailed: (name) => `${name} não conseguiu responder desta vez.`,
    synthesisFailed:
      "Não consegui juntar as respostas agora; veja o que cada especialista disse acima.",
    delegateNotFound:
      "Não encontrei esse bot na equipe, então não consegui passar a tarefa adiante.",
    specialistCut:
      "[Aviso do sistema: esta resposta foi cortada no meio e pode estar incompleta. Use só o que chegou e diga ao usuário que esta parte ficou incompleta.]",
  },
  en: {
    rosterHeader: "Your crew (other bots you know and can call by name):",
    noSkills: "no skills",
    delegationRules: (exampleName) =>
      [
        "To hand a task to a crew member, write one line per task, alone on its line, exactly like this:",
        `${DELEGATE_KEYWORD} ${exampleName}: <the full task, understandable on its own>`,
        "Rules: at most 3 lines; delegate only when the specialist adds something real; never delegate to yourself; write nothing after those lines.",
        "You will receive their answers and then write the final reply to the user. If you can answer alone, answer directly without " +
          DELEGATE_KEYWORD +
          ".",
        ANSWER_LANGUAGE_RULE.en,
      ].join("\n"),
    antiLoopRule:
      "[Anti-Loop Rule]: Answer strictly with the requested content. Never send thank-you, acknowledgement-only or courtesy messages. Do not delegate to other bots. " +
      ANSWER_LANGUAGE_RULE.en,
    userAsked: "The user's original request",
    yourTask: "Your task, sent by the Chief of Staff",
    synthesisRule:
      "Now write the final reply to the user from the specialists' answers. Do not delegate again and do not write " +
      DELEGATE_KEYWORD +
      ". " +
      ANSWER_LANGUAGE_RULE.en,
    synthesisRequest: "Specialists' answers:",
    delegatingTo: (names) => `Delegating to ${names.join(", ")}.`,
    specialistFailed: (name) => `${name} could not answer this time.`,
    synthesisFailed:
      "I could not combine the answers right now; see what each specialist said above.",
    delegateNotFound:
      "I could not find that bot on the crew, so I could not hand the task over.",
    specialistCut:
      "[System notice: this answer was cut off midway and may be incomplete. Use only what arrived and tell the user this part is incomplete.]",
  },
  es: {
    rosterHeader:
      "Tu equipo (otros bots que conoces y puedes llamar por su nombre):",
    noSkills: "sin skills",
    delegationRules: (exampleName) =>
      [
        "Para pasarle una tarea a alguien del equipo, escribe una línea por tarea, sola en su línea, exactamente así:",
        `${DELEGATE_KEYWORD} ${exampleName}: <la tarea completa, que se entienda por sí sola>`,
        "Reglas: máximo 3 líneas; delega solo cuando el especialista aporte algo real; nunca te delegues a ti mismo; después de esas líneas no escribas nada más.",
        "Recibirás sus respuestas y entonces escribirás la respuesta final al usuario. Si puedes responder solo, responde directamente, sin " +
          DELEGATE_KEYWORD +
          ".",
        ANSWER_LANGUAGE_RULE.es,
      ].join("\n"),
    antiLoopRule:
      "[Regla antibucle]: Responde estrictamente con el contenido solicitado. Nunca envíes mensajes de solo agradecimiento, confirmación o cortesía. No delegues a otros bots. " +
      ANSWER_LANGUAGE_RULE.es,
    userAsked: "Solicitud original del usuario",
    yourTask: "Tu tarea, enviada por el Chief of Staff",
    synthesisRule:
      "Ahora escribe la respuesta final al usuario a partir de las respuestas de los especialistas. No delegues de nuevo y no escribas " +
      DELEGATE_KEYWORD +
      ". " +
      ANSWER_LANGUAGE_RULE.es,
    synthesisRequest: "Respuestas de los especialistas:",
    delegatingTo: (names) => `Delegando a ${names.join(", ")}.`,
    specialistFailed: (name) => `${name} no pudo responder esta vez.`,
    synthesisFailed:
      "No pude juntar las respuestas ahora; mira arriba lo que dijo cada especialista.",
    delegateNotFound:
      "No encontré ese bot en el equipo, así que no pude pasarle la tarea.",
    specialistCut:
      "[Aviso del sistema: esta respuesta se cortó a la mitad y puede estar incompleta. Usa solo lo que llegó y dile al usuario que esta parte quedó incompleta.]",
  },
};
