type ChannelLanguage = "pt" | "en" | "es";

type ChannelTurnCopy = {
  /** Heads the channel's instructions in the leader's prompt. */
  instructionsHeader: string;
  /** The leader's reply when its model gave nothing back. */
  leaderFailed: string;
};

export const channelTurnCopy: Record<ChannelLanguage, ChannelTurnCopy> = {
  pt: {
    instructionsHeader: "Instruções deste canal:",
    leaderFailed: "Não consegui responder agora. Tente de novo em instantes.",
  },
  en: {
    instructionsHeader: "This channel's instructions:",
    leaderFailed: "I couldn't answer just now. Try again in a moment.",
  },
  es: {
    instructionsHeader: "Instrucciones de este canal:",
    leaderFailed: "No pude responder ahora. Inténtalo de nuevo en un momento.",
  },
};
