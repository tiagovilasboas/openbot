import type { ChatLanguage } from "../../../chat/respond-to-message.ts";

/** What a member says when its tools need an approval the group cannot give. */
export const NEEDS_APPROVAL: Record<ChatLanguage, (tools: string[]) => string> =
  {
    pt: (tools) =>
      `Preciso de aprovação para usar ${tools.join(", ")}, e o grupo ainda não aprova ferramentas. Peça isso em uma conversa 1:1 comigo.`,
    en: (tools) =>
      `I need approval to use ${tools.join(", ")}, and groups cannot approve tools yet. Ask me in a 1:1 chat.`,
    es: (tools) =>
      `Necesito aprobación para usar ${tools.join(", ")}, y los grupos aún no aprueban herramientas. Pídemelo en un chat 1:1.`,
  };
