import type { ChatLanguage } from "../../../chat/respond-to-message.ts";

/** What a member says when its tools ask the person a question a group cannot show. */
export const NEEDS_ANSWER: Record<ChatLanguage, (tools: string[]) => string> = {
  pt: (tools) =>
    `Preciso fazer uma pergunta (${tools.join(", ")}), e o grupo ainda não mostra perguntas. Peça isso em uma conversa 1:1 comigo.`,
  en: (tools) =>
    `I need to ask you something (${tools.join(", ")}), and groups cannot show questions yet. Ask me in a 1:1 chat.`,
  es: (tools) =>
    `Necesito hacerte una pregunta (${tools.join(", ")}), y los grupos aún no muestran preguntas. Pídemelo en un chat 1:1.`,
};
